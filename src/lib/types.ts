// Database types matching Supabase schema

export type Role = 'coach' | 'client'
export type CheckInStatus = 'pending' | 'reviewed'
export type PhotoAngle = 'front' | 'side' | 'back'

export interface Profile {
  id: string
  role: Role
  full_name: string | null
  email: string | null
  forfait: string | null
  coach_id: string | null
  created_at: string
}

export interface Workout {
  id: string
  client_id: string
  coach_id: string
  week: number
  day_label: string | null
  title: string
  coach_note: string | null
  created_at: string
  exercises?: Exercise[]
}

export interface Exercise {
  id: string
  workout_id: string
  name: string
  sets: number
  reps: string
  weight_kg: number | null
  completed: boolean
  order_index: number
}

export interface Nutrition {
  id: string
  client_id: string
  coach_id: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  coach_note: string | null
  updated_at: string
}

export interface CheckIn {
  id: string
  client_id: string
  coach_id: string | null
  week: number
  weight_kg: number | null
  energy: number | null
  sleep_hours: number | null
  sessions_done: number
  sessions_total: number
  client_note: string | null
  coach_feedback: string | null
  status: CheckInStatus
  created_at: string
  photos?: CheckInPhoto[]
  profile?: Profile
}

export interface CheckInPhoto {
  id: string
  check_in_id: string
  client_id: string
  storage_path: string
  angle: PhotoAngle
  created_at: string
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  body: string
  read: boolean
  created_at: string
  sender?: Profile
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
      }
      workouts: {
        Row: Workout
        Insert: Omit<Workout, 'id' | 'created_at' | 'exercises'>
        Update: Partial<Omit<Workout, 'id' | 'created_at' | 'exercises'>>
      }
      exercises: {
        Row: Exercise
        Insert: Omit<Exercise, 'id'>
        Update: Partial<Omit<Exercise, 'id'>>
      }
      nutrition: {
        Row: Nutrition
        Insert: Omit<Nutrition, 'id' | 'updated_at'>
        Update: Partial<Omit<Nutrition, 'id' | 'updated_at'>>
      }
      check_ins: {
        Row: CheckIn
        Insert: Omit<CheckIn, 'id' | 'created_at' | 'photos' | 'profile'>
        Update: Partial<Omit<CheckIn, 'id' | 'created_at' | 'photos' | 'profile'>>
      }
      check_in_photos: {
        Row: CheckInPhoto
        Insert: Omit<CheckInPhoto, 'id' | 'created_at'>
        Update: Partial<Omit<CheckInPhoto, 'id' | 'created_at'>>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at' | 'sender'>
        Update: Partial<Omit<Message, 'id' | 'created_at' | 'sender'>>
      }
    }
  }
}
