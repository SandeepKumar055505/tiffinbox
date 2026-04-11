/**
 * Sovereign Temporal Utilities (Frontend Manifest)
 * Orchestrating absolute temporal consistency with the 'Universal Architect' IST substrate.
 */

export const todayIST = () => {
  const d = new Date();
  // Adjust to IST (+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
};

export const tomorrowIST = () => {
  const d = new Date();
  const istOffset = (5.5 + 24) * 60 * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
};

export const formatDateSensorial = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  });
};
