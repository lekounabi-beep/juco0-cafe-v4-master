/**
 * Validation utilities
 */

export const validators = {
  phone: (value: string): boolean => {
    return /^[0-9+\s-]{8,}$/.test(value.trim());
  },
  
  email: (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  },
  
  name: (value: string): boolean => {
    return value.trim().length >= 2;
  },
  
  address: (value: string): boolean => {
    return value.trim().length >= 5;
  },
  
  required: (value: string): boolean => {
    return value.trim().length > 0;
  },
};

export const errorMessages = {
  phone: 'Παρακαλώ εισάγετε ένα έγκυρο τηλέφωνο (τουλάχιστον 8 χαρακτήρες)',
  email: 'Παρακαλώ εισάγετε ένα έγκυρο email',
  name: 'Το όνομα πρέπει να έχει τουλάχιστον 2 χαρακτήρες',
  address: 'Η διεύθυνση πρέπει να έχει τουλάχιστον 5 χαρακτήρες',
  required: 'Αυτό το πεδίο είναι υποχρεωτικό',
};
