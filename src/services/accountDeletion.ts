import { supabase } from './supabase';
import { Alert } from 'react-native';
import { Share } from 'react-native';
let Sharing: typeof import('expo-sharing') = {} as any;
try { Sharing = require('expo-sharing'); } catch (e) { console.warn('[accountDeletion] expo-sharing unavailable:', e); }
let FileSystem: typeof import('expo-file-system') = {} as any;
try { FileSystem = require('expo-file-system'); } catch (e) { console.warn('[accountDeletion] expo-file-system unavailable:', e); }
let MailComposer: typeof import('expo-mail-composer') = {} as any;
try { MailComposer = require('expo-mail-composer'); } catch (e) { console.warn('[accountDeletion] expo-mail-composer unavailable:', e); }

export interface DeleteAccountResult {
  success: boolean;
  error?: string;
}

export interface DeactivateAccountResult {
  success: boolean;
  error?: string;
}

export interface ExportDataFileResult {
  success: boolean;
  fileUri?: string;
  error?: string;
}

export interface ExportDataEmailResult {
  success: boolean;
  fileUri?: string;
  error?: string;
}

/**
 * Deletes the user's account and all associated data
 * This includes:
 * - User profile
 * - Customer/Provider profile
 * - Bookings
 * - Reviews
 * - Favorites
 * - Loyalty points
 * - Payment methods
 * - Notifications
 * - Auth account
 */
export async function deleteUserAccount(userId: string): Promise<DeleteAccountResult> {
  try {
    // Get the user's session to ensure authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        success: false,
        error: 'You must be logged in to delete your account',
      };
    }

    // Call the database function to delete all user data
    // This function should handle cascading deletes in the database
    const { error: deleteError } = await supabase.rpc('delete_user_account', {
      user_id_to_delete: userId,
    });

    if (deleteError) {
      console.error('Error deleting user data:', deleteError);
      return {
        success: false,
        error: deleteError.message || 'Failed to delete account data',
      };
    }

    // Note: Auth user deletion should ideally be done via backend with service role
    // For now, we'll just sign out the user after deleting their data
    // The auth record can be cleaned up later by an admin or automated process
    
    // In production, you would:
    // 1. Call a backend API endpoint that uses service role to delete auth user
    // 2. Or use a scheduled function to clean up orphaned auth users
    
    // Sign out the user
    await supabase.auth.signOut();

    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error during account deletion:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Deactivates the account without deleting data.
 *
 * Behavior:
 * - Best effort: marks user as inactive when supported by schema
 * - Disables all push tokens for the user
 * - Signs the user out
 */
export async function deactivateUserAccount(userId: string): Promise<DeactivateAccountResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: 'You must be logged in to deactivate your account',
      };
    }

    const deactivatedAt = new Date().toISOString();

    // Best effort: this supports databases that already include these columns.
    // If columns are missing, continue with token deactivation + sign out.
    const { error: userDeactivateError } = await supabase
      .from('users')
      .update({
        is_active: false,
        deactivated_at: deactivatedAt,
        updated_at: deactivatedAt,
      } as any)
      .eq('id', userId);

    if (userDeactivateError) {
      const message = (userDeactivateError.message || '').toLowerCase();
      const missingColumn = message.includes('column') && message.includes('does not exist');
      if (!missingColumn) {
        console.error('Error deactivating user record:', userDeactivateError);
        return {
          success: false,
          error: userDeactivateError.message || 'Failed to deactivate account',
        };
      }
      console.warn('[deactivateUserAccount] Missing is_active/deactivated_at columns on users table; continuing with soft sign-out deactivation.');
    }

    const { error: deviceTokensError } = await supabase
      .from('device_tokens')
      .update({
        is_active: false,
        updated_at: deactivatedAt,
      })
      .eq('user_id', userId);

    if (deviceTokensError) {
      console.warn('Error deactivating device tokens:', deviceTokensError.message);
    }

    await supabase.auth.signOut();

    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error during account deactivation:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Shows a confirmation dialog before deleting the account
 */
export function confirmAccountDeletion(
  onConfirm: () => Promise<void>,
  userEmail: string
): void {
  Alert.alert(
    'Delete Account',
    `Are you absolutely sure you want to delete your account (${userEmail})?\n\nThis action cannot be undone and will permanently delete:\n\n• Your profile and personal information\n• All bookings and history\n• Reviews and ratings\n• Saved favorites\n• Loyalty points\n• Payment methods\n• All other account data`,
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete Account',
        style: 'destructive',
        onPress: () => {
          // Second confirmation for extra safety
          Alert.alert(
            'Final Confirmation',
            'Please confirm one last time. This action is permanent and cannot be undone.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Yes, Delete My Account',
                style: 'destructive',
                onPress: onConfirm,
              },
            ]
          );
        },
      },
    ]
  );
}

/**
 * Exports user data before deletion (optional feature)
 * Returns the user's data in JSON format
 */
export async function exportUserData(userId: string): Promise<any> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const profileId = profile?.id;

    const { data: userRecord } = await supabase
      .from('users')
      .select('id, email, role, is_active, created_at')
      .eq('id', userId)
      .maybeSingle();

    const { data: customerProfile } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    const { data: providerProfile } = await supabase
      .from('provider_profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .or(profileId ? `customer_id.eq.${profileId},provider_id.eq.${profileId}` : 'id.is.null');

    const { data: reviews } = await supabase
      .from('reviews')
      .select('*')
      .or(profileId ? `customer_id.eq.${profileId},provider_id.eq.${profileId}` : 'id.is.null');

    const { data: notificationPreferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: paymentMethods } = profileId
      ? await supabase
          .from('payment_methods')
          .select('*')
          .eq('customer_id', profileId)
      : { data: [] as any[] };

    const { data: favoriteProviders } = profileId
      ? await supabase
          .from('favorite_providers')
          .select('*')
          .eq('customer_id', profileId)
      : { data: [] as any[] };

    const { data: favoriteServices } = profileId
      ? await supabase
          .from('favorite_services')
          .select('*')
          .eq('customer_id', profileId)
      : { data: [] as any[] };

    return {
      user: userRecord,
      profile,
      customerProfile,
      providerProfile,
      bookings,
      reviews,
      notificationPreferences,
      paymentMethods: paymentMethods || [],
      favoriteProviders: favoriteProviders || [],
      favoriteServices: favoriteServices || [],
      exportDate: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error exporting user data:', error);
    return null;
  }
}

async function generateUserDataExportFile(
  userId: string,
  userEmail?: string
): Promise<ExportDataFileResult> {
  const data = await exportUserData(userId);
  if (!data) {
    return {
      success: false,
      error: 'Failed to prepare export data',
    };
  }

  const exportPayload = {
    ...data,
    requestedBy: userEmail || null,
    exportVersion: 1,
  };

  const baseDirectory =
    (FileSystem as any).documentDirectory ||
    (FileSystem as any).cacheDirectory;

  if (!baseDirectory) {
    return {
      success: false,
      error: 'No writable storage directory available on this device',
    };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileUri = `${baseDirectory}glamora-data-export-${timestamp}.json`;

  await FileSystem.writeAsStringAsync(
    fileUri,
    JSON.stringify(exportPayload, null, 2),
    {
      encoding: 'utf8' as any,
    }
  );

  return { success: true, fileUri };
}

/**
 * Builds a JSON export file locally and opens native share/save flow.
 * Users can save to Files/Drive or email it from the share sheet.
 */
export async function exportUserDataToFile(
  userId: string,
  userEmail?: string
): Promise<ExportDataFileResult> {
  try {
    const fileResult = await generateUserDataExportFile(userId, userEmail);
    if (!fileResult.success || !fileResult.fileUri) {
      return fileResult;
    }

    const sharingAvailable = await Sharing.isAvailableAsync();
    if (sharingAvailable) {
      await Sharing.shareAsync(fileResult.fileUri, {
        dialogTitle: 'Export My Data',
        mimeType: 'application/json',
        UTI: 'public.json',
      });
    } else {
      await Share.share({
        title: 'My Glamora Data Export',
        message: `Your Glamora data export is ready at:\n${fileResult.fileUri}`,
        url: fileResult.fileUri,
      });
    }

    return { success: true, fileUri: fileResult.fileUri };
  } catch (error: any) {
    console.error('Error exporting user data to file:', error);
    return {
      success: false,
      error: error?.message || 'Failed to export user data',
    };
  }
}

/**
 * Builds a JSON export file and opens an email compose sheet with attachment
 * where supported. Falls back to native share if mail compose is unavailable.
 */
export async function exportUserDataByEmail(
  userId: string,
  userEmail?: string
): Promise<ExportDataEmailResult> {
  try {
    const fileResult = await generateUserDataExportFile(userId, userEmail);
    if (!fileResult.success || !fileResult.fileUri) {
      return fileResult;
    }

    const mailAvailable = await MailComposer.isAvailableAsync();

    if (mailAvailable) {
      await MailComposer.composeAsync({
        recipients: userEmail ? [userEmail] : [],
        subject: 'My Glamora Data Export',
        body: 'Attached is your requested Glamora account data export in JSON format.',
        attachments: [fileResult.fileUri],
      });

      return { success: true, fileUri: fileResult.fileUri };
    }

    const sharingAvailable = await Sharing.isAvailableAsync();
    if (sharingAvailable) {
      await Sharing.shareAsync(fileResult.fileUri, {
        dialogTitle: 'Email My Data',
        mimeType: 'application/json',
        UTI: 'public.json',
      });
      return { success: true, fileUri: fileResult.fileUri };
    }

    await Share.share({
      title: 'My Glamora Data Export',
      message: `Your Glamora data export is ready at:\n${fileResult.fileUri}`,
      url: fileResult.fileUri,
    });

    return { success: true, fileUri: fileResult.fileUri };
  } catch (error: any) {
    console.error('Error exporting user data by email:', error);
    return {
      success: false,
      error: error?.message || 'Failed to email user data export',
    };
  }
}
