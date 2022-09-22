interface ErrorReporter extends IndexableData, ErrorReporterDB {}

interface ErrorReporterDB {
  lastReportDate: null | number;
}
