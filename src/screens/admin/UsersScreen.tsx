import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';

interface AdminUser {
  id: string;
  email: string | null;
  role: 'admin' | 'provider' | 'customer' | null;
  created_at: string | null;
}

export default function AdminUsersScreen() {
  const navigation = useNavigation<any>();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setUsers((data as AdminUser[]) || []);
    } catch (error) {
      console.error('Failed to load admin users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleContactUser = (user: AdminUser) => {
    navigation.navigate('Chat', {
      otherUserId: user.id,
      otherUserName: user.email || 'User',
      isSupportChat: true,
    });
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={users}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
        setRefreshing(true);
        loadUsers();
      }} />}
      ListHeaderComponent={
        <View style={styles.headerCard}>
          <Text style={styles.title}>Users</Text>
          <Text style={styles.subtitle}>{users.length} recent users loaded</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.userCard}>
          <Text style={styles.userEmail}>{item.email || 'No email'}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.userRole}>{item.role || 'unknown'}</Text>
            <Text style={styles.userDate}>
              {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'n/a'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => handleContactUser(item)}
          >
            <Text style={styles.contactButtonText}>Contact</Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No users found.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  userCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  userEmail: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userRole: {
    fontSize: fontSize.xs,
    color: colors.primary,
    textTransform: 'uppercase',
    fontWeight: fontWeight.semibold,
  },
  userDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  contactButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  contactButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});