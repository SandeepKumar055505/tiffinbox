# TiffinPoint — Translations (i18n)

> English (default) + Hindi. All UI strings go here. Mirror in `frontend/src/i18n/`.

---

## Usage

```typescript
// frontend/src/i18n/index.ts
import en from './en';
import hi from './hi';

const translations = { en, hi };

export function useTranslation() {
  const lang = localStorage.getItem('tb_lang') || 'en';
  const t = (key: string): string => {
    const keys = key.split('.');
    let val: any = translations[lang as 'en' | 'hi'];
    for (const k of keys) val = val?.[k];
    return val ?? key;  // fallback to key if missing
  };
  return { t, lang };
}

// Language toggle
export function setLanguage(lang: 'en' | 'hi') {
  localStorage.setItem('tb_lang', lang);
  window.location.reload();
}
```

---

## English Strings (`frontend/src/i18n/en.ts`)

```typescript
export default {
  // --- Common ---
  common: {
    loading: 'Loading...',
    error: 'Something went wrong',
    retry: 'Retry',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    next: 'Next',
    submit: 'Submit',
    close: 'Close',
    view_all: 'View All',
    no_data: 'Nothing here yet',
    required: 'This field is required',
  },

  // --- Auth ---
  auth: {
    sign_in_google: 'Sign in with Google',
    admin_login: 'Admin Login',
    email: 'Email',
    password: 'Password',
    login_button: 'Login',
    login_error: 'Invalid email or password',
    logging_in: 'Logging in...',
  },

  // --- Navigation ---
  nav: {
    home: 'Home',
    persons: 'Persons',
    notifications: 'Notifications',
    profile: 'Profile',
  },

  // --- Dashboard ---
  dashboard: {
    title: 'My Plans',
    subtitle: 'Your active meal subscriptions',
    no_plans: 'No plans yet',
    no_plans_desc: 'Start your first tiffin plan',
    start_plan: 'Start a Plan',
    active: 'Active',
    completed: 'Completed',
    paused: 'Paused',
    cancelled: 'Cancelled',
  },

  // --- Subscribe flow ---
  subscribe: {
    title: 'New Plan',
    select_person: 'Who is this plan for?',
    select_plan: 'Choose plan duration',
    plan_1day: '1 Day',
    plan_1week: '1 Week',
    plan_2weeks: '2 Weeks',
    week_pattern: 'Which days?',
    pattern_full: 'Full Week (Mon–Sun)',
    pattern_no_sun: 'Without Sunday (Mon–Sat)',
    pattern_weekdays: 'Weekdays Only (Mon–Fri)',
    start_date: 'Start Date',
    customize_meals: 'Customize Meals',
    // Grid
    grid_title: 'Your Meal Plan',
    grid_subtitle: 'Uncheck meals to skip them',
    max_days_off: 'You can skip at most 2 complete days per week',
    max_days_off_reached: 'Max days off reached',
    // Checkout
    checkout_title: 'Review & Pay',
    promo_placeholder: 'Promo code (optional)',
    apply_promo: 'Apply',
    promo_applied: 'Promo applied!',
    promo_invalid: 'Invalid or expired promo code',
    pay_button: 'Pay ₹{{amount}}',
    // Success
    success_title: "You're all set! 🎉",
    success_subtitle: 'Your meal plan is active',
    view_plan: 'View My Plan',
    add_another: 'Add Another Person',
  },

  // --- Subscription detail ---
  subscription: {
    title: 'My Plan',
    tab_schedule: 'Schedule',
    tab_extras: 'Extras',
    person: 'For',
    plan: 'Plan',
    dates: 'Dates',
    status: 'Status',
    next_delivery: 'Next Delivery',
    skip_meal: 'Skip this meal',
    cancel_plan: 'Cancel Plan',
    cancel_confirm: 'Are you sure? Unused days may be refunded.',
    // Status labels
    status_scheduled: 'Scheduled',
    status_preparing: 'Preparing',
    status_out_for_delivery: 'On the way',
    status_delivered: 'Delivered',
    status_skipped: 'Skipped',
    status_cancelled: 'Cancelled',
  },

  // --- Persons ---
  persons: {
    title: 'Family Members',
    add: 'Add Person',
    edit_title: 'Edit Person',
    name: 'Name',
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    spice_level: 'Spice Level',
    spice_mild: 'Mild',
    spice_medium: 'Medium',
    spice_hot: 'Hot',
    allergies: 'Allergies',
    allergies_placeholder: 'e.g. nuts, dairy',
    notes: 'Notes',
    notes_placeholder: 'Any other preferences...',
    delete_confirm: 'Delete this person?',
    delete_has_sub: 'Cannot delete — has an active subscription',
    max_reached: 'Maximum persons limit reached',
  },

  // --- Skip ---
  skip: {
    title: 'Skip Meal',
    before_cutoff: 'Skip will be applied immediately. You save ₹{{amount}}.',
    after_cutoff: 'Cutoff has passed. Send a skip request to admin?',
    confirm_button: 'Skip Meal',
    success: 'Meal skipped',
    request_sent: 'Skip request sent — pending admin approval',
    already_skipped: 'Already skipped',
    cancelled: 'Skip cancelled',
  },

  // --- Extras ---
  extras: {
    title: 'Add Extras',
    add_button: 'Add Extra',
    select_item: 'Choose an item',
    select_date: 'Choose date',
    quantity: 'Quantity',
    added: 'Extra added!',
    removed: 'Extra removed',
  },

  // --- Pricing ---
  pricing: {
    base_total: 'Subtotal',
    discount: 'Plan Discount',
    extras: 'Extras',
    promo: 'Promo',
    final_total: 'Total',
    per_day: 'per day',
    save: 'You save ₹{{amount}}',
  },

  // --- Notifications ---
  notifications: {
    title: 'Notifications',
    empty: 'No notifications',
    mark_all_read: 'Mark all read',
  },

  // --- Support ---
  support: {
    title: 'Support',
    new_ticket: 'New Ticket',
    subject: 'Subject',
    message: 'Message',
    send: 'Send',
    reply_placeholder: 'Type your reply...',
    reply: 'Reply',
    status_open: 'Open',
    status_pending: 'Pending',
    status_resolved: 'Resolved',
    empty: 'No tickets yet',
    empty_desc: 'Have a question? Open a ticket',
  },

  // --- Profile ---
  profile: {
    title: 'Profile',
    name: 'Name',
    email: 'Email',
    member_since: 'Member Since',
    logout: 'Logout',
    logout_confirm: 'Logout from TiffinPoint?',
    language: 'Language',
    lang_en: 'English',
    lang_hi: 'Hindi',
  },

  // --- Meal types ---
  meals: {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    extra: 'Extra',
  },

  // --- Errors ---
  errors: {
    network: 'Network error. Check your connection.',
    payment_failed: 'Payment failed. Please try again.',
    session_expired: 'Session expired. Please login again.',
    not_found: 'Page not found',
  },
};
```

---

## Hindi Strings (`frontend/src/i18n/hi.ts`)

```typescript
export default {
  common: {
    loading: 'लोड हो रहा है...',
    error: 'कुछ गड़बड़ हो गई',
    retry: 'पुनः प्रयास करें',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    confirm: 'पुष्टि करें',
    delete: 'हटाएं',
    edit: 'संपादित करें',
    back: 'वापस',
    next: 'अगला',
    submit: 'जमा करें',
    close: 'बंद करें',
    view_all: 'सब देखें',
    no_data: 'यहाँ कुछ नहीं है',
    required: 'यह क्षेत्र आवश्यक है',
  },

  auth: {
    sign_in_google: 'Google से साइन इन करें',
    admin_login: 'व्यवस्थापक लॉगिन',
    email: 'ईमेल',
    password: 'पासवर्ड',
    login_button: 'लॉगिन',
    login_error: 'गलत ईमेल या पासवर्ड',
    logging_in: 'लॉग इन हो रहा है...',
  },

  nav: {
    home: 'होम',
    persons: 'सदस्य',
    notifications: 'सूचनाएं',
    profile: 'प्रोफ़ाइल',
  },

  dashboard: {
    title: 'मेरी योजनाएं',
    subtitle: 'आपके सक्रिय भोजन सदस्यता',
    no_plans: 'अभी कोई योजना नहीं',
    no_plans_desc: 'अपनी पहली टिफिन योजना शुरू करें',
    start_plan: 'योजना शुरू करें',
    active: 'सक्रिय',
    completed: 'पूर्ण',
    paused: 'रोका गया',
    cancelled: 'रद्द',
  },

  subscribe: {
    title: 'नई योजना',
    select_person: 'यह योजना किसके लिए है?',
    select_plan: 'योजना अवधि चुनें',
    plan_1day: '1 दिन',
    plan_1week: '1 सप्ताह',
    plan_2weeks: '2 सप्ताह',
    week_pattern: 'कौन से दिन?',
    pattern_full: 'पूरा सप्ताह (सोम–रवि)',
    pattern_no_sun: 'रविवार के बिना (सोम–शनि)',
    pattern_weekdays: 'केवल कार्यदिवस (सोम–शुक्र)',
    start_date: 'शुरू की तारीख',
    customize_meals: 'भोजन कस्टमाइज़ करें',
    grid_title: 'आपकी भोजन योजना',
    grid_subtitle: 'छोड़ने के लिए अनचेक करें',
    max_days_off: 'आप प्रति सप्ताह अधिकतम 2 दिन छोड़ सकते हैं',
    max_days_off_reached: 'अधिकतम छुट्टी दिन पहुंच गए',
    checkout_title: 'समीक्षा और भुगतान',
    promo_placeholder: 'प्रोमो कोड (वैकल्पिक)',
    apply_promo: 'लागू करें',
    promo_applied: 'प्रोमो लागू!',
    promo_invalid: 'अमान्य या समाप्त प्रोमो कोड',
    pay_button: '₹{{amount}} का भुगतान करें',
    success_title: 'सब तैयार है! 🎉',
    success_subtitle: 'आपकी भोजन योजना सक्रिय है',
    view_plan: 'मेरी योजना देखें',
    add_another: 'एक और सदस्य जोड़ें',
  },

  subscription: {
    title: 'मेरी योजना',
    tab_schedule: 'शेड्यूल',
    tab_extras: 'अतिरिक्त',
    person: 'के लिए',
    plan: 'योजना',
    dates: 'तारीखें',
    status: 'स्थिति',
    next_delivery: 'अगली डिलीवरी',
    skip_meal: 'यह भोजन छोड़ें',
    cancel_plan: 'योजना रद्द करें',
    cancel_confirm: 'क्या आप सुनिश्चित हैं? अप्रयुक्त दिनों का धनवापसी हो सकता है।',
    status_scheduled: 'निर्धारित',
    status_preparing: 'तैयारी हो रही है',
    status_out_for_delivery: 'रास्ते में',
    status_delivered: 'डिलीवर',
    status_skipped: 'छोड़ा गया',
    status_cancelled: 'रद्द',
  },

  persons: {
    title: 'परिवार के सदस्य',
    add: 'सदस्य जोड़ें',
    edit_title: 'सदस्य संपादित करें',
    name: 'नाम',
    vegetarian: 'शाकाहारी',
    vegan: 'वीगन',
    spice_level: 'मसाला स्तर',
    spice_mild: 'हल्का',
    spice_medium: 'मध्यम',
    spice_hot: 'तीखा',
    allergies: 'एलर्जी',
    allergies_placeholder: 'जैसे मेवे, दूध',
    notes: 'नोट्स',
    notes_placeholder: 'कोई अन्य प्राथमिकता...',
    delete_confirm: 'इस सदस्य को हटाएं?',
    delete_has_sub: 'हटा नहीं सकते — सक्रिय सदस्यता है',
    max_reached: 'अधिकतम सदस्य सीमा पहुंच गई',
  },

  skip: {
    title: 'भोजन छोड़ें',
    before_cutoff: 'स्किप तुरंत लागू होगा। आप ₹{{amount}} बचाएंगे।',
    after_cutoff: 'समय सीमा बीत गई। व्यवस्थापक को अनुरोध भेजें?',
    confirm_button: 'भोजन छोड़ें',
    success: 'भोजन छोड़ा गया',
    request_sent: 'अनुरोध भेजा — प्रतीक्षा में',
    already_skipped: 'पहले से छोड़ा गया',
    cancelled: 'स्किप रद्द',
  },

  extras: {
    title: 'अतिरिक्त जोड़ें',
    add_button: 'अतिरिक्त जोड़ें',
    select_item: 'आइटम चुनें',
    select_date: 'तारीख चुनें',
    quantity: 'मात्रा',
    added: 'अतिरिक्त जोड़ा गया!',
    removed: 'अतिरिक्त हटाया गया',
  },

  pricing: {
    base_total: 'उप-योग',
    discount: 'योजना छूट',
    extras: 'अतिरिक्त',
    promo: 'प्रोमो',
    final_total: 'कुल',
    per_day: 'प्रति दिन',
    save: 'आप ₹{{amount}} बचाएंगे',
  },

  notifications: {
    title: 'सूचनाएं',
    empty: 'कोई सूचना नहीं',
    mark_all_read: 'सब पढ़ा हुआ करें',
  },

  support: {
    title: 'सहायता',
    new_ticket: 'नई टिकट',
    subject: 'विषय',
    message: 'संदेश',
    send: 'भेजें',
    reply_placeholder: 'अपना उत्तर लिखें...',
    reply: 'उत्तर दें',
    status_open: 'खुला',
    status_pending: 'प्रतीक्षा में',
    status_resolved: 'हल हो गया',
    empty: 'अभी कोई टिकट नहीं',
    empty_desc: 'कोई प्रश्न? टिकट खोलें',
  },

  profile: {
    title: 'प्रोफ़ाइल',
    name: 'नाम',
    email: 'ईमेल',
    member_since: 'सदस्यता तिथि',
    logout: 'लॉगआउट',
    logout_confirm: 'TiffinPoint से लॉगआउट करें?',
    language: 'भाषा',
    lang_en: 'अंग्रेज़ी',
    lang_hi: 'हिंदी',
  },

  meals: {
    breakfast: 'नाश्ता',
    lunch: 'दोपहर का खाना',
    dinner: 'रात का खाना',
    extra: 'अतिरिक्त',
  },

  errors: {
    network: 'नेटवर्क त्रुटि। कनेक्शन जांचें।',
    payment_failed: 'भुगतान विफल। कृपया पुनः प्रयास करें।',
    session_expired: 'सत्र समाप्त। कृपया फिर से लॉगिन करें।',
    not_found: 'पृष्ठ नहीं मिला',
  },
};
```

---

## Template Strings

For strings with dynamic values like `pay_button: 'Pay ₹{{amount}}'`:

```typescript
// Utility
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}

// Usage
const label = interpolate(t('subscribe.pay_button'), { amount: 1500 });
// → "Pay ₹1500"
```
