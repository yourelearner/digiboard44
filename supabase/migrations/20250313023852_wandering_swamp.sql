/*
  # Create sessions table and storage setup

  1. New Tables
    - `sessions`
      - `id` (uuid, primary key)
      - `teacher_id` (uuid, references auth.users)
      - `student_id` (uuid, references auth.users)
      - `video_url` (text)
      - `whiteboard_data` (text)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `created_at` (timestamptz)

  2. Storage
    - Create a new bucket for session recordings
    - Set up storage policies

  3. Security
    - Enable RLS on sessions table
    - Add policies for authenticated users
*/

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES auth.users NOT NULL,
  student_id uuid REFERENCES auth.users NOT NULL,
  video_url text NOT NULL,
  whiteboard_data text NOT NULL,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Teachers can view their own sessions"
  ON sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view their own sessions"
  ON sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can create sessions"
  ON sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- Create storage bucket for session recordings
INSERT INTO storage.buckets (id, name)
VALUES ('session_recordings', 'session_recordings')
ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can upload session recordings"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'session_recordings');

CREATE POLICY "Users can view their session recordings"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'session_recordings' AND (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE video_url LIKE '%' || storage.objects.name || '%'
      AND (auth.uid() = student_id OR auth.uid() = teacher_id)
    )
  ));