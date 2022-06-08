interface SettingsData extends IndexableData {
  showSecondaryDisplay: boolean; // Mostrar Display secundario y pausar al inicio
  updated_to_life: boolean;
  first_experience_status: "idle"; // Ocultar primera experiencia first_experience_status
  downloadsPath: string; // Directorio de descarga de clases C1
  playerVolume: number; // Volumen reproductor C7
  gymsLogoPath: string; // Archivo logo gimnasios C8
  offlineResolution: "hd" | "hq"; // Calidad videos al descargar offline C9
  resolutionCreateMP4: "hd" | "hq"; // Calidad HD al generar mp4, C10
  autoStartGymsScheduler: boolean; // Iniciar planificador de gimnasios automáticamente, C11
  waitingMusicPath: string; // Archivo música en espera, waiting_music_file
  maxDownloadsSize: number; // Espacio máximo en GB ocupado por descargas C13
  playOnlyOffline: boolean; // Siempre se trata de reproducir una clase offline desde el planificador play_only_offline_classes
  download_scheduled_training_classes: boolean;
  C16: boolean; // Aceleración generador MP4
  videoHD: boolean;
  showMonitorView: boolean; // Mostrar vista monitor
  show_external_setup_video: boolean; // Mostrar video de ajuste en pantalla externa
  ask_graph_intro_video: boolean; // Mostrar popup de ajuste bicicleta en pantalla externa
  defaultRoom: number;
}
