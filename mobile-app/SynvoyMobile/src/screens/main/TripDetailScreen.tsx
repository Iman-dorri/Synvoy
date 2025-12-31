import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { theme, colors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import apiService from '../../services/api';
import LinearGradient from 'react-native-linear-gradient';

const TripDetailScreen = ({ route, navigation }: any) => {
  const { tripId } = route.params || {};
  const { user } = useSelector((state: RootState) => state.auth);
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [availableConnections, setAvailableConnections] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(false);

  useEffect(() => {
    if (user && tripId) {
      fetchTrip();
    }
  }, [tripId, user]);

  const fetchTrip = async () => {
    setLoading(true);
    setError('');
    try {
      const fetchedTrip = await apiService.getTrip(tripId);
      setTrip(fetchedTrip);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trip');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInviteModal = async () => {
    setShowInviteModal(true);
    setLoadingConnections(true);
    try {
      const connections = await apiService.getConnections('accepted');
      // Filter out users already in the trip
      const participantIds = trip?.participants?.map((p: any) => p.user_id) || [];
      const available = connections.filter((conn: any) => {
        // Get the other user from the connection
        // Connection can have user/connected_user or user_id/connected_user_id
        const otherUser = conn.user_id === user?.id ? (conn.connected_user || { id: conn.connected_user_id }) : (conn.user || { id: conn.user_id });
        const otherUserId = otherUser.id || (conn.user_id === user?.id ? conn.connected_user_id : conn.user_id);
        // Filter out deleted users, users scheduled for deletion, and users already in the trip
        // Check if user is deleted or scheduled for deletion
        const isDeleted = otherUser.deleted_at != null;
        const isScheduledForDeletion = otherUser.deletion_requested_at != null || otherUser.status === 'pending_deletion';
        // Also filter out users with missing name/username (incomplete data)
        const hasValidName = otherUser.first_name || otherUser.last_name || otherUser.username;
        return otherUserId && !isDeleted && !isScheduledForDeletion && hasValidName && !participantIds.includes(otherUserId);
      });
      setAvailableConnections(available);
    } catch (err: any) {
      setError(err.message || 'Failed to load connections');
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleInviteUsers = async () => {
    if (selectedUsers.length === 0) return;
    
    setInviting(true);
    setError('');
    try {
      await apiService.inviteUsers(tripId, selectedUsers);
      await fetchTrip(); // Refresh trip data
      setShowInviteModal(false);
      setSelectedUsers([]);
    } catch (err: any) {
      setError(err.message || 'Failed to invite users');
    } finally {
      setInviting(false);
    }
  };

  const handleAcceptInvitation = async (participantId: string) => {
    try {
      await apiService.updateParticipantStatus(tripId, participantId, 'accepted');
      await fetchTrip();
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
    }
  };

  const handleDeleteTrip = () => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteTrip(tripId);
              navigation.goBack();
            } catch (err: any) {
              setError(err.message || 'Failed to delete trip');
            }
          },
        },
      ]
    );
  };

  const handleRemoveParticipant = (participantId: string, participantName: string) => {
    Alert.alert(
      'Remove Participant',
      `Are you sure you want to remove ${participantName} from this trip?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.removeParticipant(tripId, participantId);
              await fetchTrip();
            } catch (err: any) {
              setError(err.message || 'Failed to remove participant');
            }
          },
        },
      ]
    );
  };

  if (loading && !trip) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading trip...</Text>
      </View>
    );
  }

  if (!trip) return null;

  const isCreator = trip.user_id === user?.id;
  const currentParticipant = trip.participants?.find((p: any) => p.user_id === user?.id);
  const acceptedParticipants = trip.participants?.filter((p: any) => p.status === 'accepted') || [];
  const pendingParticipants = trip.participants?.filter((p: any) => p.status === 'pending') || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.emerald[500];
      case 'completed':
        return colors.gray[500];
      default:
        return colors.primary[500];
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Details</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Trip Info */}
        <View style={styles.card}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripTitle}>{trip.title}</Text>
            {currentParticipant?.status === 'pending' && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>⏳ Pending Invitation</Text>
              </View>
            )}
          </View>
          {trip.description && (
            <Text style={styles.tripDescription}>{trip.description}</Text>
          )}
          <View style={styles.tripMeta}>
            {trip.start_date && (
              <Text style={styles.metaText}>📅 Start: {new Date(trip.start_date).toLocaleDateString()}</Text>
            )}
            {trip.end_date && (
              <Text style={styles.metaText}>📅 End: {new Date(trip.end_date).toLocaleDateString()}</Text>
            )}
            {trip.budget && (
              <Text style={styles.metaText}>💰 Budget: ${trip.budget}</Text>
            )}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
              <Text style={styles.statusText}>{trip.status}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {currentParticipant?.status === 'accepted' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Chat', { tripId })}
              >
                <LinearGradient
                  colors={[colors.primary[600], colors.cyan[500]]}
                  style={styles.chatButtonGradient}
                >
                  <Icon name="message" size={18} color={colors.text.white} />
                  <Text style={styles.chatButtonText}>Open Group Chat</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            {isCreator && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteTrip}
              >
                <Icon name="delete" size={18} color={colors.text.white} />
                <Text style={styles.deleteButtonText}>Delete Trip</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Participants */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Participants</Text>
            {isCreator && (
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={handleOpenInviteModal}
              >
                <LinearGradient
                  colors={[colors.primary[600], colors.cyan[500]]}
                  style={styles.inviteButtonGradient}
                >
                  <Icon name="person-add" size={18} color={colors.text.white} />
                  <Text style={styles.inviteButtonText}>Invite</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Accepted Participants */}
          {acceptedParticipants.length > 0 && (
            <View style={styles.participantsSection}>
              <Text style={styles.participantsSubtitle}>Accepted ({acceptedParticipants.length})</Text>
              {acceptedParticipants.map((participant: any) => (
                <View key={participant.id} style={styles.participantItem}>
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>
                      {participant.user?.first_name} {participant.user?.last_name}
                      {participant.role === 'creator' && ' (Creator)'}
                    </Text>
                    <Text style={styles.participantUsername}>@{participant.user?.username}</Text>
                  </View>
                  <View style={styles.participantActions}>
                    {participant.user_id !== user?.id && (
                      <TouchableOpacity
                        style={styles.chatUserButton}
                        onPress={() => navigation.navigate('Chat', { userId: participant.user_id })}
                      >
                        <Icon name="message" size={18} color={colors.primary[600]} />
                      </TouchableOpacity>
                    )}
                    {isCreator && participant.role !== 'creator' && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveParticipant(
                          participant.id,
                          `${participant.user?.first_name} ${participant.user?.last_name}`
                        )}
                      >
                        <Icon name="person-remove" size={18} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Pending Invitations */}
          {pendingParticipants.length > 0 && (
            <View style={styles.participantsSection}>
              <Text style={styles.participantsSubtitle}>Pending ({pendingParticipants.length})</Text>
              {pendingParticipants.map((participant: any) => (
                <View key={participant.id} style={[styles.participantItem, styles.pendingParticipant]}>
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>
                      {participant.user?.first_name} {participant.user?.last_name}
                    </Text>
                    <Text style={styles.participantUsername}>@{participant.user?.username}</Text>
                  </View>
                  <View style={styles.participantActions}>
                    {participant.user_id === user?.id && participant.status === 'pending' && (
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleAcceptInvitation(participant.id)}
                      >
                        <Icon name="check" size={18} color={colors.text.white} />
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>
                    )}
                    {isCreator && participant.role !== 'creator' && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveParticipant(
                          participant.id,
                          `${participant.user?.first_name} ${participant.user?.last_name}`
                        )}
                      >
                        <Icon name="person-remove" size={18} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite Users to Trip</Text>
            {loadingConnections ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
                <Text style={styles.modalLoadingText}>Loading connections...</Text>
              </View>
            ) : availableConnections.length > 0 ? (
              <>
                <FlatList
                  data={availableConnections}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    // Get the other user from the connection
                    const otherUser = item.user_id === user?.id 
                      ? (item.connected_user || { id: item.connected_user_id, first_name: '', last_name: '', username: '' })
                      : (item.user || { id: item.user_id, first_name: '', last_name: '', username: '' });
                    const otherUserId = otherUser.id || (item.user_id === user?.id ? item.connected_user_id : item.user_id);
                    const isSelected = selectedUsers.includes(otherUserId);
                    return (
                      <TouchableOpacity
                        style={[
                          styles.connectionItem,
                          isSelected && styles.connectionItemSelected,
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedUsers(selectedUsers.filter(id => id !== otherUserId));
                          } else {
                            setSelectedUsers([...selectedUsers, otherUserId]);
                          }
                        }}
                      >
                        <Icon
                          name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                          size={24}
                          color={isSelected ? colors.primary[600] : colors.gray[400]}
                        />
                        <View style={styles.connectionInfo}>
                          <Text style={styles.connectionName}>
                            {otherUser.first_name} {otherUser.last_name}
                          </Text>
                          <Text style={styles.connectionUsername}>@{otherUser.username}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  style={styles.connectionsList}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setShowInviteModal(false);
                      setSelectedUsers([]);
                    }}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalInviteButton,
                      (selectedUsers.length === 0 || inviting) && styles.modalInviteButtonDisabled,
                    ]}
                    onPress={handleInviteUsers}
                    disabled={selectedUsers.length === 0 || inviting}
                  >
                    {inviting ? (
                      <ActivityIndicator size="small" color={colors.text.white} />
                    ) : (
                      <Text style={styles.modalInviteText}>
                        Invite ({selectedUsers.length})
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalEmptyText}>No available connections to invite.</Text>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowInviteModal(false)}
                >
                  <Text style={styles.modalCancelText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.light,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    minHeight: 60,
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  errorContainer: {
    backgroundColor: colors.error + '20',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: theme.fontSize.sm,
  },
  card: {
    backgroundColor: colors.background.default,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  tripTitle: {
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
    flex: 1,
  },
  pendingBadge: {
    backgroundColor: colors.yellow[100],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  pendingBadgeText: {
    fontSize: theme.fontSize.xs,
    color: colors.yellow[800],
    fontWeight: theme.fontWeight.medium,
  },
  tripDescription: {
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  tripMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  metaText: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    color: colors.text.white,
    fontWeight: theme.fontWeight.medium,
    textTransform: 'capitalize',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    flexWrap: 'wrap',
  },
  chatButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  chatButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  deleteButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
  },
  inviteButton: {
    // Style handled by gradient
  },
  inviteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  inviteButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  participantsSection: {
    marginTop: theme.spacing.md,
  },
  participantsSubtitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  pendingParticipant: {
    backgroundColor: colors.yellow[50],
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  participantUsername: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
  },
  participantActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  chatUserButton: {
    padding: theme.spacing.sm,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.emerald[600],
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  acceptButtonText: {
    color: colors.text.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  removeButton: {
    padding: theme.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.default,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  modalLoading: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  modalLoadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
  },
  connectionsList: {
    maxHeight: 300,
    marginBottom: theme.spacing.md,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  connectionItemSelected: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[50],
  },
  connectionInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  connectionName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  connectionUsername: {
    fontSize: theme.fontSize.sm,
    color: colors.text.secondary,
  },
  modalEmptyText: {
    fontSize: theme.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: colors.background.default,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.primary,
  },
  modalInviteButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: colors.primary[600],
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  modalInviteButtonDisabled: {
    opacity: 0.5,
  },
  modalInviteText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text.white,
  },
});

export default TripDetailScreen;

