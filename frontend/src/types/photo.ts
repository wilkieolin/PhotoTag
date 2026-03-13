export interface Tag {
  id: number;
  name: string;
  source: 'user' | 'ai';
  color: string | null;
  created_at: string;
}

export interface Photo {
  id: number;
  file_path: string;
  filename: string;
  file_size: number;
  mime_type: string;
  width: number | null;
  height: number | null;
  date_taken: string | null;
  date_file: string;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  camera_make: string | null;
  camera_model: string | null;
  lens_model: string | null;
  focal_length: number | null;
  aperture: number | null;
  shutter_speed: string | null;
  iso: number | null;
  orientation: number;
  thumbnail_path: string | null;
  has_embedding: boolean;
  has_ai_tags: boolean;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface SimilarPhotoResult {
  photo: Photo;
  similarity: number;
}

export interface ScanStatus {
  id: number;
  directory: string;
  status: 'pending' | 'scanning' | 'processing' | 'completed' | 'failed';
  total_files: number;
  processed_files: number;
  new_photos: number;
  skipped_files: number;
  error_count: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface TaskStatus {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    phase?: string;
    current?: number;
    total?: number;
  };
  error: string | null;
}

export interface WatchedDirectory {
  id: number;
  directory: string;
  recursive: boolean;
  last_scanned: string | null;
  created_at: string;
}

export interface Stats {
  total_photos: number;
  total_tags: number;
  photos_with_embeddings: number;
  photos_with_ai_tags: number;
  photos_with_gps: number;
  total_storage_bytes: number;
}
