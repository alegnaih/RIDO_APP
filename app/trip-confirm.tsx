// app/trip-confirm.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTripDraftStore } from '../src/store/useTripDraftStore';
import { RoutePreviewMap } from '../src/components/trip/RoutePreviewMap';
import {useAuth} from '../src/hooks/useAuth';
import { TripCodeModal } from '../src/components/trip/TripCodeModal';
import { createTrip, updateTrip } from '../src/services/tripService';
import Slider from '@react-native-community/slider';
import {Colors} from '../src/theme/colors';
import { MAX_TRIP_NAME_LENGTH, MAX_TRIP_DESCRIPTION_LENGTH, MAX_TRIP_STOPOVERS } from '../src/constants/tripLimits';
import { getTrustedTime, getTrustedDate } from '../src/utils/time';
import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';

export default function TripConfirmScreen() {
  const router = useRouter();
  const draft = useTripDraftStore();
  const { user } = useAuth();
  const isEditing = !!draft.editingTripId;
  const [isRouteVisible, setIsRouteVisible] = useState(true);
  const [isMembersVisible, setIsMembersVisible] = useState(true);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false); 
  const [showMaximizedMap, setShowMaximizedMap] = useState(false);
  
   // Picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [createdTrip, setCreatedTrip] = useState<{ id: string, code: string } | null>(null);

  const handleCancel = () => {
    Alert.alert('Cancel this trip?', 'Are you sure you want to discard this trip?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: () => {
        draft.resetDraft();
        router.replace('/(tabs)/map');
      }},
    ]);
  };

  const saveTitleEdit = () => {
    if (!draft.title.trim()) {
      Alert.alert('Invalid Trip Name', 'Please enter a trip name.');
      return;
    }
    if (draft.title.length > MAX_TRIP_NAME_LENGTH) {
      Alert.alert('Trip Name Too Long', `Trip names cannot exceed ${MAX_TRIP_NAME_LENGTH} characters.`);
      return;
    }
    draft.setDetails(draft.title.trim(), draft.date, draft.startTime);
    setIsEditingDetails(false);
  };

  const saveDescriptionEdit = () => {
    if (draft.description.length > MAX_TRIP_DESCRIPTION_LENGTH) {
      Alert.alert('Description Too Long', `Descriptions cannot exceed ${MAX_TRIP_DESCRIPTION_LENGTH} characters.`);
      return;
    }
    draft.setDescription(draft.description.trim());
    setIsEditingDesc(false);
  };

  const handleConfirm = async () => {
    const title = draft.title.trim();
    const description = draft.description.trim();
    if (!title || title.length > MAX_TRIP_NAME_LENGTH) {
      Alert.alert('Invalid Trip Name', `Please enter a trip name of up to ${MAX_TRIP_NAME_LENGTH} characters.`);
      return;
    }
    if (description.length > MAX_TRIP_DESCRIPTION_LENGTH) {
      Alert.alert('Description Too Long', `Descriptions cannot exceed ${MAX_TRIP_DESCRIPTION_LENGTH} characters.`);
      return;
    }
    if (draft.stopovers.length > MAX_TRIP_STOPOVERS) {
      Alert.alert('Maximum Stopovers Reached', `A trip can only have ${MAX_TRIP_STOPOVERS} stopovers.`);
      return;
    }
    if (!draft.meetingPoint || !draft.endPoint) {
      Alert.alert('Missing Locations', 'Please select a meeting point and destination.');
      return;
    }
    if (!draft.date || draft.date.getTime() <= getTrustedTime()) {
      Alert.alert('Invalid Schedule', 'Please choose a future departure date and time.');
      return;
    }

    setIsCreating(true);
    try {
      if (isEditing) {
        // Recheck the current stored schedule before saving route edits.
        // Final enforcement should also live in Firestore security rules.
        const editingTripId = draft.editingTripId!;
        const savedTrip = await getDoc(doc(getFirestore(), 'trips', editingTripId));
        if (!savedTrip.exists()) {
          Alert.alert('Trip Not Found', 'This trip no longer exists.');
          return;
        }
        const data = savedTrip.data();
        const currentStart = data?.scheduledAt?.toDate?.()?.getTime();
        if (
          data?.createdBy !== user?.uid ||
          data?.status === 'completed' ||
          data?.status === 'cancelled' ||
          typeof currentStart !== 'number' ||
          getTrustedTime() >= currentStart
        ) {
          Alert.alert('Editing Unavailable', 'This trip can no longer be edited.');
          return;
        }

        await updateTrip(editingTripId, {
          title,
          scheduledAt: draft.date,
          startTime: draft.startTime,
          meetingPoint: draft.meetingPoint,
          startPoint: draft.meetingPoint,
          endPoint: draft.endPoint,
          stopovers: draft.stopovers,
          strayThreshold: draft.strayThreshold || 50,
          description,
          routeGeometry: draft.routeGeometry,
          totalDistance: draft.totalDistance,
          routeLegDistances: draft.routeLegDistances,
          routeLegDurations: draft.routeLegDurations,
        });
        draft.resetDraft();
        Alert.alert('Success', 'Trip details and route updated!');
        router.replace(`/trip/${editingTripId}`);
      } else {
        const trip = await createTrip({
          title,
          scheduledAt: draft.date,
          startTime: draft.startTime,
          meetingPoint: draft.meetingPoint,
          endPoint: draft.endPoint,
          stopovers: draft.stopovers,
          strayThreshold: draft.strayThreshold || 50,
          description,
          routeGeometry: draft.routeGeometry,
          totalDistance: draft.totalDistance,
          routeLegDistances: draft.routeLegDistances,
          routeLegDurations: draft.routeLegDurations,
          creatorName: user?.name || user?.email?.split('@')[0] || 'Leader',
        });
        setCreatedTrip({ id: trip.id, code: trip.shareCode });
      }
    } catch (error) {
      console.error('Failed to save trip:', error);
      Alert.alert('Error', 'Could not save trip. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Format Date
  const dateStr = draft.date ? draft.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No date set';

    // create the members list
  const members = [
    {
      id: user?.uid || 'temp-id',
      name: user?.name || user?.email?.split('@')[0] || 'You', // Fallback to email prefix or 'You'
      isLeader: true, // The creator is always the leader on this screen
    }
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={Colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirmation</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Map Preview */}
        <RoutePreviewMap onMaximize={() => setShowMaximizedMap(true)} />

                {/* Ride Details (Editable) */}
        <View style={styles.detailsHeader}>
          <View style={styles.tripTitleContainer}>
            {isEditingDetails ? (
              <TextInput
                style={[styles.title, styles.titleEditInput]}
                value={draft.title}
                onChangeText={(val) => draft.setDetails(val, draft.date, draft.startTime)}
                maxLength={MAX_TRIP_NAME_LENGTH}
                numberOfLines={1}
              />
            ) : (
              <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                {draft.title}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.headerEditButton}
            onPress={() => isEditingDetails ? saveTitleEdit() : setIsEditingDetails(true)}
          >
            <Text style={styles.editText}>{isEditingDetails ? 'Save' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
        {isEditingDetails && (
          <Text style={styles.titleCounter}>
            {draft.title.length}/{MAX_TRIP_NAME_LENGTH}
          </Text>
        )}

        <Text style={styles.subText}><Feather name="user" size={14} /> Hosted by You</Text>
        
        {isEditingDetails ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
              <Feather name="calendar" size={14} color={Colors.black} />
              <Text style={styles.dateBtnText}>{dateStr}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowTimePicker(true)}>
              <Feather name="clock" size={14} color={Colors.black} />
              <Text style={styles.dateBtnText}>{draft.startTime || 'Set Time'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.subText}><Feather name="clock" size={14} /> {dateStr} at {draft.startTime}</Text>
        )}

        {/* Date/Time Pickers Modals */}
        {showDatePicker && (
          <DateTimePicker
            value={draft.date || getTrustedDate()}
            mode="date"
            minimumDate={getTrustedDate()}
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                const newDate = new Date(date);
                if (draft.date) {
                  newDate.setHours(draft.date.getHours());
                  newDate.setMinutes(draft.date.getMinutes());
                }
                draft.setDetails(draft.title, newDate, draft.startTime);
              }
            }}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={draft.date || getTrustedDate()}
            mode="time"
            onChange={(event, date) => {
              setShowTimePicker(false);
              if (date) {
                const newDate = draft.date ? new Date(draft.date) : new Date();
                newDate.setHours(date.getHours());
                newDate.setMinutes(date.getMinutes());
                newDate.setSeconds(0);              
                const formatted = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                draft.setDetails(draft.title, newDate, formatted);
              }
            }}
          />
        )}

                {/* Description */}
        <Text style={styles.sectionLabel}>DESCRIPTION</Text>
        {isEditingDesc ? (
          <View>
            <TextInput
              style={styles.descInput}
              multiline
              placeholder="Add a description for this trip..."
              value={draft.description}
              onChangeText={draft.setDescription}
              maxLength={MAX_TRIP_DESCRIPTION_LENGTH}
              autoFocus
            />
            <Text style={styles.descriptionCounter}>
             {draft.description.length}/{MAX_TRIP_DESCRIPTION_LENGTH}
            </Text>
            <TouchableOpacity style={styles.doneBtn} onPress={saveDescriptionEdit}>
              <Text style={styles.doneBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.descPlaceholder} onPress={() => setIsEditingDesc(true)}>
            <Text style={draft.description ? styles.descText : styles.descPlaceholderText}>
              {draft.description || 'Add a description for this trip.'}
            </Text>
          </TouchableOpacity>
        )}

{/* ✅ Route Section (Fixed Distances) */}
        <View style={styles.routeHeader}>
          <TouchableOpacity style={styles.routeTitleContainer} onPress={() => setIsRouteVisible(!isRouteVisible)}>
            <Feather name={isRouteVisible ? "chevron-up" : "chevron-down"} size={18} color="#111" />
            <Text style={styles.sectionLabel}>ROUTE</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push({ pathname: '/create-trip', params: { mode: 'locations' } })}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {isRouteVisible && (
          <View style={styles.routeList}>
            {/* Start */}
            <View style={styles.routeItem}>
              <View style={[styles.dot, { backgroundColor: Colors.success }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locName}>{draft.meetingPoint?.name}</Text>
              </View>
            </View>

            {/* Stopovers */}
            {draft.stopovers.map((stop, index) => (
              <View key={index} style={styles.routeItem}>
                <View style={[styles.dot, { backgroundColor: Colors.muted }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locName}>{stop.name}</Text>
                </View>
                <Text style={styles.distanceText}>{draft.routeLegDistances[index] || '...'}</Text>
              </View>
            ))}

            {/* Destination */}
            <View style={styles.routeItem}>
              <View style={[styles.dot, { backgroundColor: Colors.brightRed }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locName}>{draft.endPoint?.name}</Text>
              </View>
              <Text style={styles.distanceText}>{draft.routeLegDistances[draft.routeLegDistances.length - 1] || '...'}</Text>
            </View>
          </View>
        )}

        {/* ✅ NEW: Stray Alert Threshold Slider */}
        <View style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sectionLabel}>STRAY ALERT THRESHOLD</Text>
            <Text style={styles.sliderValue}>{draft.strayThreshold} meters</Text>
          </View>
          
          <View style={styles.sliderContainer}>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={20}
              maximumValue={100}
              step={10}
              value={draft.strayThreshold}
              onValueChange={draft.setStrayThreshold}
              minimumTrackTintColor={Colors.greenBtn} 
              maximumTrackTintColor="#D1D1D1"
              thumbTintColor={Colors.greenBtn}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>20m</Text>
              <Text style={[styles.sliderLabelText, { fontWeight: '700', color: Colors.greenBtn }]}>50m (Default)</Text>
              <Text style={styles.sliderLabelText}>100m</Text>
            </View>
          </View>
          
          <Text style={styles.sliderHint}>
            Leader and the rider will be alerted if a rider deviate more than {draft.strayThreshold}m from the planned route.
          </Text>
        </View>

        {/* ✅ Members Section */}
       <View style={styles.membersHeader}>
          <TouchableOpacity 
            style={styles.routeTitleContainer} 
            onPress={() => setIsMembersVisible(!isMembersVisible)}
          >
            <Feather 
              name={isMembersVisible ? "chevron-up" : "chevron-down"} 
              size={18} 
              color={Colors.black}
            />
            <Text style={styles.sectionLabel}>MEMBERS ({members.length})</Text>
          </TouchableOpacity>
          
        </View>
        
        {isMembersVisible && (
          <>
            {members.map((member) => (
              <View key={member.id} style={styles.memberItem}>
                <Feather name="user" size={16} color={Colors.black} />
                <Text style={styles.memberName}>
                  {member.name}{' '}
                  {member.isLeader && <Text style={styles.leaderBadge}>LEADER</Text>}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Buttons */}
        <View style={styles.footerButtons}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={isCreating}>
            <Text style={styles.confirmText}>{isCreating ? 'Saving...' : isEditing ? 'Save Changes' : 'Confirm'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>


  {/*✅ Full Screen Map Modal */}
      <Modal visible={showMaximizedMap} animationType="slide">
        <View style={{ flex: 1 }}>
          <RoutePreviewMap 
            isFullScreen={true} 
            onClose={() => setShowMaximizedMap(false)} 
          />
        </View>
      </Modal>

      {/* Trip Created Code Modal */}
      {createdTrip && (
        <TripCodeModal 
          visible={!!createdTrip} 
          tripCode={createdTrip.code} 
          onClose={() => {
            const tripId = createdTrip.id;
            setCreatedTrip(null);
            draft.resetDraft();
            router.replace(`/trip/${tripId}`);
          }} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.offWhite
  },
  content: { 
    padding: 20, 
    paddingTop: 60, 
    paddingBottom: 40 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  headerTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: Colors.muted 
  },
  detailsHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    marginTop: 20 
  },
  tripTitleContainer: { flex: 1, minWidth: 0 },
  headerEditButton: { paddingHorizontal: 6, paddingVertical: 8 },
  titleEditInput: { borderBottomWidth: 1, borderColor: Colors.darkGreen, paddingBottom: 4, minWidth: 0 },
  titleCounter: { fontSize: 11, color: Colors.muted, marginTop: 6 },
  title: { 
    fontSize: 22, 
    fontWeight: '700', 
    color:  Colors.black,
    flexShrink: 1,
  },
  editText: { 
    color:  Colors.greenBtn,
    fontSize: 14, 
    fontWeight: '600' 
  },
  subText: { 
    fontSize: 13, 
    color: Colors.muted, 
    marginTop: 6 
  },
  dateBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: Colors.backgroundOverlay,  
    padding: 8, 
    borderRadius: 8 
  },
  dateBtnText: { 
    fontSize: 13, 
    color:  Colors.black 
  },
  sectionLabel: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: Colors.muted, 
    letterSpacing: 1, 
    marginTop: 24, 
    marginBottom: 10 
  },
  descPlaceholder: { 
    borderWidth: 1, 
    borderColor:Colors.muted, 
    borderRadius: 10, 
    padding: 14, 
    minHeight: 60 
  },
  descPlaceholderText: { 
    color: Colors.muted, 
    fontStyle: 'italic', 
    fontSize: 14 
  },
  descText: { 
    color:  Colors.black, 
    fontSize: 14 
  },
  descInput: { 
    borderWidth: 1, 
    borderColor: Colors.greenBtn,  
    borderRadius: 10, 
    padding: 14, 
    minHeight: 80, 
    textAlignVertical: 'top', 
    backgroundColor: Colors.offWhite
  },
  doneBtn: { 
    alignSelf: 'flex-end', 
    marginTop: 4 
  },
  doneBtnText: { 
    color: Colors.greenBtn,   
    fontWeight: '600' 
  },
  routeHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  routeTitleContainer: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  routeList: { 
    backgroundColor: Colors.backgroundOverlay, 
    borderRadius: 12, 
    padding: 16 
  },
  routeItem: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginBottom: 16 
  },
  dot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    marginTop: 4, 
    marginRight: 12 
  },
  locName: { 
    fontSize: 14, 
    fontWeight: '600', 
    color:  Colors.black 
  },
  distanceText: { 
    fontSize: 12, 
    color: Colors.muted 
  },
  membersHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  memberItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  memberName: { 
    fontSize: 14, 
    color:  Colors.black, 
    marginLeft: 8, 
    fontWeight: '500' 
  },
  leaderBadge: { 
    backgroundColor: Colors.greenBg, 
    color: Colors.darkGreen, 
    fontSize: 10, 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 4, 
    overflow: 'hidden' 
  },
  footerButtons: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    marginTop: 40, 
    gap: 12 
  },
  cancelBtn: { 
    paddingVertical: 12, 
    paddingHorizontal: 24, 
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: Colors.muted
  },
  cancelText: { 
    color: Colors.black, 
    fontWeight: '600' 
  },
  confirmBtn: { 
    paddingVertical: 12, 
    paddingHorizontal: 24, 
    borderRadius: 24, 
    backgroundColor:Colors.greenBtn, 
  },
  tapToManage: { 
    fontSize: 11, 
    color: Colors.muted, 
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 16
  },
  sliderSection: { 
    marginTop: 24, 
    marginBottom: 8 
  },
  sliderHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  sliderValue: { 
    fontSize: 14, 
    fontWeight: '700', 
    color:  Colors.greenBtn,
    backgroundColor: Colors.greenBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12 
  },
  sliderContainer: { 
    marginTop: 8,  
    backgroundColor: Colors.backgroundOverlay, 
    borderRadius: 20, 
    maxHeight: 50, 
    justifyContent: 'center', 
    paddingHorizontal: 10,   
    overflow: 'hidden',
  },
  sliderLabels: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 4 
  },
  sliderLabelText: { 
    fontSize: 11, 
    color: Colors.muted,
    fontWeight: '500' 
  },
  sliderHint: { 
    fontSize: 12, 
    color: Colors.muted, 
    fontStyle: 'italic', 
    marginTop: 8 
  },
  confirmText: { 
    color: Colors.offWhite, 
    fontWeight: '600' 
  },
  descriptionCounter: {
  fontSize: 11,
  color: Colors.muted,
  textAlign: 'right',
  marginTop: 5,
  marginBottom: 8,
},
});