export function formatPhoneNumber(phoneNumber?: string | null): string | null {
  if (!phoneNumber) return null;

  // remove all non-digit characters
  phoneNumber = phoneNumber.startsWith("+")
    ? "+" + phoneNumber.replace(/\D/g, "")
    : phoneNumber.replace(/\D/g, "");

  // add prefix +381 if the number starts with 0
  if (phoneNumber.startsWith("0")) {
    phoneNumber = `+381${phoneNumber.slice(1)}`;
  }

  // add spaces after the country code
  if (/^\+\d{1,3}/.test(phoneNumber)) {
    phoneNumber = `${phoneNumber.slice(0, 4)} ${phoneNumber.slice(4, 6)} ${phoneNumber.slice(6, 9)} ${phoneNumber.slice(9)}`;
  }

  return phoneNumber;
}
