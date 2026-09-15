import type { PlanDay, WorkoutExercise, WorkoutSession } from '../../types/state';

export function sessionExercisesWithContext(session: WorkoutSession, day?: PlanDay): WorkoutExercise[] {
  return session.exercises.map((exercise) => {
    if (exercise.prescription && exercise.block) return exercise;
    const block = day?.blocks.find((item) => item.exercises.some((p) => p.exerciseId === exercise.exerciseId));
    const prescribed = block?.exercises.find((item) => item.exerciseId === exercise.exerciseId);
    const sets = new Set(exercise.sets.map((set) => set.setNumber)).size;
    const snapshot = prescribed ? { ...prescribed, sets: sets || prescribed.sets } : undefined;
    return {
      ...exercise,
      ...(exercise.prescription ? {} : snapshot ? { prescription: snapshot } : {}),
      ...(exercise.block ? {} : block ? { block: { id: block.id, type: block.type, ...(block.type === 'superset' ? { rounds: sets || block.rounds || prescribed?.sets || 1 } : {}), ...(block.restAfterRoundSeconds !== undefined ? { restAfterRoundSeconds: block.restAfterRoundSeconds } : {}) } } : {}),
    };
  });
}

/** Rest is between completed rounds; per-side rows together form one exercise in a round. */
export function nextWorkoutStep(exercises: WorkoutExercise[], exerciseId: string, setNumber: number, defaultRestSeconds: number) {
  const currentIndex = exercises.findIndex((item) => item.exerciseId === exerciseId);
  const current = exercises[currentIndex];
  if (!current) return { restSeconds: 0, nextExerciseIndex: null };
  const currentRound = current.sets.filter((set) => set.setNumber === setNumber);
  if (!currentRound.length || currentRound.some((set) => !set.completedAt)) return { restSeconds: 0, nextExerciseIndex: null };
  if (current.block?.type !== 'superset') {
    const hasRemaining = current.sets.some((set) => !set.completedAt);
    return { restSeconds: hasRemaining ? current.prescription?.restSeconds ?? defaultRestSeconds : 0, nextExerciseIndex: null };
  }
  const members = exercises.map((item, index) => ({ item, index })).filter(({ item }) => item.block?.id === current.block?.id);
  const pendingThisRound = members.find(({ item }) => item.sets.some((set) => set.setNumber === setNumber && !set.completedAt));
  if (pendingThisRound) return { restSeconds: 0, nextExerciseIndex: pendingThisRound.index };
  const next = members.find(({ item }) => item.sets.some((set) => !set.completedAt));
  return {
    restSeconds: next ? current.block.restAfterRoundSeconds ?? defaultRestSeconds : 0,
    nextExerciseIndex: next?.index ?? null,
  };
}
