import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { exportAllData } from '../db/dashboard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

export function SettingsScreen() {
  const navigation = useNavigation();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const jsonString = JSON.stringify(data, null, 2);
      const today = new Date().toISOString().split('T')[0];
      await Share.share({
        message: jsonString,
        title: `gymtrack-export-${today}.json`,
      });
    } catch {
      // ignore - user may have cancelled share sheet
    } finally {
      setIsExporting(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Export Data</Text>
          <Text style={styles.cardDescription}>
            Export all workout data as JSON for backup
          </Text>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExport}
            disabled={isExporting}
            activeOpacity={0.85}>
            {isExporting ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text style={styles.exportButtonText}>Export</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>GymTrack v1.0</Text>
          <Text style={styles.aboutSubtitle}>Local-only workout tracker</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: fontSize.xl,
    color: colors.accent,
    fontWeight: weightBold,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginBottom: spacing.md,
  },
  exportButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  exportButtonText: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.background,
  },
  aboutCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.base,
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  aboutSubtitle: {
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
});
