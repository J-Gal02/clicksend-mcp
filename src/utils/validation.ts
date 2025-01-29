export function validatePhoneNumber(phone: string): boolean {
  // Basic E.164 format validation (e.g., +61423456789)
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

export function validateMessage(message: string): boolean {
  // Check if message is not empty and within reasonable length
  return message.length > 0 && message.length <= 1600; // 1600 is ClickSend's max length
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateSMSParams(to: string, message: string): void {
  if (!validatePhoneNumber(to)) {
    throw new ValidationError('Invalid phone number format. Must be in E.164 format (e.g., +61423456789)');
  }
  if (!validateMessage(message)) {
    throw new ValidationError('Invalid message. Must be between 1 and 1600 characters');
  }
}

export function validateTTSParams(to: string, message: string, voice?: string): void {
  if (!validatePhoneNumber(to)) {
    throw new ValidationError('Invalid phone number format. Must be in E.164 format (e.g., +61423456789)');
  }
  if (!validateMessage(message)) {
    throw new ValidationError('Invalid message. Must be between 1 and 1600 characters');
  }
  if (voice && !['male', 'female'].includes(voice)) {
    throw new ValidationError('Invalid voice option. Must be either "male" or "female"');
  }
}
