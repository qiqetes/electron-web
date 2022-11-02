type TrainingClass = {
  id: number | string;
  category_nr: number;
  comments_count: number;
  content: string | null;
  cover_xl: string | null;
  cover: string | null;
  delay_seconds: number;
  duration_seconds: number;
  duration_training: number;
  extra_media: Media[];
  free: boolean;
  graph_watts: number | null;
  graph: string | null;
  has_background: number | boolean;
  is_black: number | boolean;
  is_new: number | boolean;
  kcal: number | null;
  level_nr: number;
  life_flexibility_points: number;
  life_force_points: number;
  life_mind_points: number;
  life_resistance_points: number;
  materials_info: string;
  max_duration_seconds: number;
  media: Media[];
  official: boolean;
  progression_watts?: ProgressionWats[] | null;
  progression?: Progression[] | null;
  published_at_timestamp: number;
  published_at: string;
  secondary_training_type_nr: number | null;
  secondary_training_type: string | null;
  sharing_requests_count: number;
  short_title: string;
  show_effort: number | boolean;
  subtitle: string | null;
  title: string;
  trainer_id: number | string;
  trainer?: Trainer;
  training_type_nr: number;
  training_type: string;
};

interface Progression {
  track: string;
  block: string;
  rpm: string;
  artist: string | null;
  resistance: string;
  timeString: string;
  method: string;
  zone: number;
}

interface ProgressionWats {
  rpm: string;
  zone: number;
  block: string;
  resistance: string;
  method: string;
  timeString: string;
  artist: string | null;
  track: string;
  endOfInterval: number;
  startOfInterval: number;
}

interface TrainingClassesData extends IndexableData {
  trainingClasses: { [id: string]: TrainingClass };
  trainingClassesToFetch: (number | string)[];
}
