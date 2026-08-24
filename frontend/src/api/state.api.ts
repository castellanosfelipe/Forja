import type { UserState, WorkoutExercise, WorkoutSession } from '../types/state';
import { api } from './client';

export const stateApi = {
  get: () => api<UserState>('/api/state'),
  replace: (state: UserState) => api<UserState>('/api/state', {
    method: 'PUT',
    headers: { 'If-Match': `"${state.revision}"` },
    json: state,
  }),
  previousExercise: (exerciseId: string) => api<{ exercise: WorkoutExercise | null }>(
    `/api/workouts/previous/${encodeURIComponent(exerciseId)}`,
  ),
  completeWorkout: (sessionId: string) => api<{ session: WorkoutSession; progression: UserState['progression'] }>(
    `/api/workouts/${encodeURIComponent(sessionId)}/complete`,
    { method: 'POST', json: {} },
  ),
};
