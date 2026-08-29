import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert Eastern Arabic/Indic digits (٠١٢٣٤٥٦٧٨٩ or ۰۱۲۳۴۵۶۷۸۹) to ASCII English digits (0123456789)
export function convertArabicDigitsToEnglish(input: string | number): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  return str.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (char) => {
    return String(char.charCodeAt(0) & 0xf);
  });
}

// Price formatter using English digits
export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return formatted + ' ج.م';
}

// Format numbers into English digits
export function formatArabicNumber(num: number | string): string {
  if (num === '' || num === null || num === undefined) return '';
  return convertArabicDigitsToEnglish(new Intl.NumberFormat('en-US').format(Number(num)));
}

// Format Date into Arabic Locale but with English digits
export function formatArabicDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const formatted = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return convertArabicDigitsToEnglish(formatted);
}

// Check if a date belongs to the current daily shift (starts at 9:00 AM)
export function isTodayShift(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;

  const now = new Date();
  
  // Calculate start of current shift (9:00 AM)
  const shiftStart = new Date(now);
  shiftStart.setHours(9, 0, 0, 0);
  
  // If we are currently before 9 AM, the shift started yesterday
  if (now.getHours() < 9) {
    shiftStart.setDate(shiftStart.getDate() - 1);
  }
  
  // Shift ends 24 hours after it starts
  const shiftEnd = new Date(shiftStart);
  shiftEnd.setDate(shiftEnd.getDate() + 1);
  
  return date >= shiftStart && date < shiftEnd;
}

// Egyptian Plate Validation & Formatting
// Valid Arabic letters used in plates
const ARABIC_LETTERS_ONLY_REGEX = /^[\u0600-\u06FF]+$/;
const NUMBERS_REGEX = /^[0-9]{1,4}$/;

export function validatePlateLetters(letters: string): boolean {
  // Strip all whitespace and verify 1 to 4 Arabic characters
  const clean = letters.replace(/\s+/g, '');
  return clean.length >= 1 && clean.length <= 4 && ARABIC_LETTERS_ONLY_REGEX.test(clean);
}

export function validatePlateNumbers(numbers: string): boolean {
  const clean = convertArabicDigitsToEnglish(numbers.trim());
  return NUMBERS_REGEX.test(clean);
}

export function buildPlateDisplay(letters: string, numbers: string): string {
  const cleanLetters = letters.replace(/\s+/g, '').split('').join(' ');
  const cleanNumbers = convertArabicDigitsToEnglish(numbers.trim());
  return `${cleanLetters} ${cleanNumbers}`.trim();
}

export function validatePhone(phone: string): boolean {
  // Egyptian mobile number validation (010, 011, 012, 015 - 11 digits)
  const clean = convertArabicDigitsToEnglish(phone.trim());
  const egPhoneRegex = /^01[0125][0-9]{8}$/;
  return egPhoneRegex.test(clean);
}

export function formatPlateLettersInput(value: string): string {
  // Strip all spaces and non-Arabic characters, limit to 1-4 letters, and space-format nicely
  const clean = value.replace(/\s+/g, '').replace(/[^\u0600-\u06FF]/g, '').slice(0, 4);
  return clean.split('').join(' ');
}
