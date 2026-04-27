import React, { useRef } from 'react';
import {
  Alert,
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, getCategoryColor } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightMedium, weightSemiBold } from '../theme/typography';
import { Exercise } from '../types';

const SWIPE_THRESHOLD = -80;
const DELETE_ZONE_WIDTH = 80;

interface ExerciseListItemProps {
  exercise: Exercise;
  onDelete?: () => void;
  onSelect?: () => void;
  onLongPress?: () => void;
}

export function ExerciseListItem({ exercise, onDelete, onSelect, onLongPress }: ExerciseListItemProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipeOpen = useRef(false);

  const canSwipe = !!onDelete;

  // Fade in the delete zone only when the card starts sliding
  const deleteOpacity = translateX.interpolate({
    inputRange: [-DELETE_ZONE_WIDTH, -10, 0],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        canSwipe && Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10,
      onPanResponderMove: (_, gestureState) => {
        if (!canSwipe) return;
        const newX = isSwipeOpen.current
          ? Math.min(0, gestureState.dx - DELETE_ZONE_WIDTH)
          : Math.min(0, gestureState.dx);
        translateX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!canSwipe) return;
        const currentX = isSwipeOpen.current
          ? gestureState.dx - DELETE_ZONE_WIDTH
          : gestureState.dx;

        if (currentX < SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -DELETE_ZONE_WIDTH,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          isSwipeOpen.current = true;
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          isSwipeOpen.current = false;
        }
      },
    }),
  ).current;

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Exercise',
      `Are you sure you want to delete "${exercise.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
            isSwipeOpen.current = false;
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(),
        },
      ],
    );
  };

  const rowContent = (
    <View style={styles.row}>
      <View
        style={[
          styles.accentBar,
          { backgroundColor: getCategoryColor(exercise.category) },
        ]}
      />
      <View style={styles.nameContainer}>
        <Text style={styles.name}>{exercise.name}</Text>
        {exercise.measurementType === 'timed' && (
          <View style={styles.timedBadge}>
            <Text style={styles.timedBadgeText}>Timed</Text>
          </View>
        )}
      </View>
    </View>
  );

  const cardStyle = canSwipe ? styles.cardSwipeable : styles.card;

  const cardInner = onSelect || onLongPress ? (
    <TouchableOpacity
      onPress={onSelect}
      onLongPress={onLongPress}
      delayLongPress={1000}
      style={cardStyle}>
      {rowContent}
    </TouchableOpacity>
  ) : (
    <View style={cardStyle}>{rowContent}</View>
  );

  if (!canSwipe) {
    return cardInner;
  }

  return (
    <View style={styles.swipeContainer}>
      <Animated.View style={[styles.deleteAction, { opacity: deleteOpacity }]}>
        <TouchableOpacity
          style={styles.deleteActionTouchable}
          onPress={handleDeletePress}
          activeOpacity={0.8}>
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}>
        {cardInner}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_ZONE_WIDTH,
    borderRadius: 14,
    overflow: 'hidden',
  },
  deleteActionTouchable: {
    flex: 1,
    backgroundColor: colors.danger,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingRight: spacing.base,
    paddingLeft: 0,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardSwipeable: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingRight: spacing.base,
    paddingLeft: 0,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: spacing.md,
    marginLeft: spacing.md,
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.primary,
    flexShrink: 1,
  },
  timedBadge: {
    backgroundColor: colors.timerActive,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  timedBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: weightMedium,
    color: colors.background,
  },
});
