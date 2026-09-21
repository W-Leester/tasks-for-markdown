// Single place that configures dayjs plugins so every core module shares one instance.
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(customParseFormat);
dayjs.extend(isoWeek);

export type { Dayjs } from 'dayjs';
export { dayjs };

export const ISO_DATE = 'YYYY-MM-DD';
