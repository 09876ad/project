// Catalog of bookable services. Category is deliberately coarse because it is
// what workers are tagged with; each item is a specific job the customer picks.
// Keeping this small (7 categories, 4 jobs each) keeps the picker browsable.

const CATEGORIES = [
  {
    category: 'Electrical',
    categoryHi: 'विद्युत',
    priceRange: [300, 900],
    items: [
      { slug: 'ceiling-fan-repair', name: 'Ceiling fan not working', nameHi: 'सीलिंग फैन काम नहीं कर रहा', description: 'Fan not spinning, humming, or speed control faulty.', descriptionHi: 'फैन नहीं घूम रहा, आवाज़ कर रहा है या स्पीड खराब है।' },
      { slug: 'light-switch-fault', name: 'Light or switch fault', nameHi: 'लाइट या स्विच खराब', description: 'Flickering lights, dead switch, or loose socket.', descriptionHi: 'लाइट टिमटिमाना, स्विच बंद या ढीला सॉकेट।' },
      { slug: 'wiring-inspection', name: 'Wiring inspection', nameHi: 'वायरिंग जाँच', description: 'Tripping breakers, burning smell, or a full wiring check.', descriptionHi: 'बार-बार एमसीबी गिरना, जलने की गंध या पूरी वायरिंग जाँच।' },
      { slug: 'inverter-battery', name: 'Inverter or battery issue', nameHi: 'इनवर्टर या बैटरी समस्या', description: 'Inverter not charging or backup cutting out early.', descriptionHi: 'इनवर्टर चार्ज नहीं हो रहा या बैकअप जल्दी खत्म हो रहा है।' },
    ],
  },
  {
    category: 'Plumbing',
    categoryHi: 'प्लंबिंग',
    priceRange: [250, 900],
    items: [
      { slug: 'tap-pipe-leak', name: 'Tap or pipe leak', nameHi: 'नल या पाइप लीक', description: 'Dripping tap, leaking joint, or burst pipe.', descriptionHi: 'नल टपकना, जोड़ से रिसाव या पाइप फटना।' },
      { slug: 'blocked-drain', name: 'Blocked drain', nameHi: 'नाली जाम', description: 'Slow sink, blocked bathroom drain, or overflowing line.', descriptionHi: 'सिंक धीमा, बाथरूम नाली जाम या पानी बहना।' },
      { slug: 'geyser-repair', name: 'Geyser repair', nameHi: 'गीज़र मरम्मत', description: 'Geyser not heating or leaking from the tank.', descriptionHi: 'गीज़र गर्म नहीं हो रहा या टंकी से रिसाव।' },
      { slug: 'toilet-cistern', name: 'Toilet or cistern issue', nameHi: 'शौचालय या टंकी समस्या', description: 'Running flush, weak flush, or leaking cistern.', descriptionHi: 'फ्लश बहता रहना, कमज़ोर फ्लश या टंकी से रिसाव।' },
    ],
  },
  {
    category: 'Appliance Repair',
    categoryHi: 'उपकरण मरम्मत',
    priceRange: [500, 1500],
    items: [
      { slug: 'ac-not-cooling', name: 'AC not cooling', nameHi: 'एसी ठंडा नहीं कर रहा', description: 'Low cooling, water leak, or unusual noise.', descriptionHi: 'कम ठंडक, पानी रिसाव या असामान्य आवाज़।' },
      { slug: 'fridge-not-cooling', name: 'Fridge not cooling', nameHi: 'फ्रिज ठंडा नहीं कर रहा', description: 'Warm fridge, freezer frost, or compressor noise.', descriptionHi: 'फ्रिज गर्म, फ्रीज़र में बर्फ या कंप्रेसर की आवाज़।' },
      { slug: 'washing-machine-fault', name: 'Washing machine fault', nameHi: 'वॉशिंग मशीन खराब', description: 'Not draining, not spinning, or showing an error code.', descriptionHi: 'पानी नहीं निकल रहा, स्पिन नहीं हो रहा या एरर कोड।' },
      { slug: 'microwave-oven-fault', name: 'Microwave or oven fault', nameHi: 'माइक्रोवेव या ओवन खराब', description: 'Not heating, door switch, or display failure.', descriptionHi: 'गर्म नहीं हो रहा, दरवाज़ा स्विच या डिस्प्ले खराब।' },
    ],
  },
  {
    category: 'Cleaning',
    categoryHi: 'सफाई',
    priceRange: [400, 2500],
    items: [
      { slug: 'bathroom-deep-clean', name: 'Bathroom deep clean', nameHi: 'बाथरूम गहरी सफाई', description: 'Tiles, fittings, stains, and hard-water scale.', descriptionHi: 'टाइल्स, फिटिंग, दाग और पानी की परत।' },
      { slug: 'kitchen-deep-clean', name: 'Kitchen deep clean', nameHi: 'रसोई गहरी सफाई', description: 'Counters, chimney, cabinets, and grease removal.', descriptionHi: 'काउंटर, चिमनी, कैबिनेट और चिकनाई की सफाई।' },
      { slug: 'full-home-deep-clean', name: 'Full home deep clean', nameHi: 'पूरे घर की गहरी सफाई', description: 'Room-by-room cleaning for the whole house.', descriptionHi: 'पूरे घर का कमरा-दर-कमरा गहरी सफाई।' },
      { slug: 'utensil-cleaning', name: 'Utensil cleaning', nameHi: 'बर्तन सफाई', description: 'Daily or event utensil washing at home.', descriptionHi: 'घर पर रोज़मर्रा या आयोजन के बर्तन धुलाई।' },
    ],
  },
  {
    category: 'Carpentry',
    categoryHi: 'बढ़ईगीरी',
    priceRange: [400, 1200],
    items: [
      { slug: 'door-lock-repair', name: 'Door or lock repair', nameHi: 'दरवाज़ा या ताला मरम्मत', description: 'Sticking door, broken hinge, or jammed lock.', descriptionHi: 'दरवाज़ा अटकना, टूटा कब्ज़ा या ताला जाम।' },
      { slug: 'furniture-assembly', name: 'Furniture assembly', nameHi: 'फर्नीचर असेंबली', description: 'New furniture setup or re-assembly after moving.', descriptionHi: 'नया फर्नीचर सेटअप या शिफ्टिंग के बाद दोबारा जोड़ना।' },
      { slug: 'wardrobe-cabinet-repair', name: 'Wardrobe or cabinet repair', nameHi: 'अलमारी या कैबिनेट मरम्मत', description: 'Loose doors, broken shelves, or drawer runners.', descriptionHi: 'ढीले दरवाज़े, टूटी शेल्फ या दराज़ की पटरी।' },
      { slug: 'bed-table-repair', name: 'Bed or table repair', nameHi: 'बिस्तर या मेज़ मरम्मत', description: 'Wobbly frame, cracked board, or loose legs.', descriptionHi: 'हिलता फ्रेम, टूटा बोर्ड या ढीली टाँगें।' },
    ],
  },
  {
    category: 'Painting',
    categoryHi: 'पुताई',
    priceRange: [800, 3000],
    items: [
      { slug: 'single-room-painting', name: 'Single room painting', nameHi: 'एक कमरे की पुताई', description: 'One room refreshed with putty and two coats.', descriptionHi: 'पुट्टी और दो कोट के साथ एक कमरा।' },
      { slug: 'full-home-painting', name: 'Full home painting', nameHi: 'पूरे घर की पुताई', description: 'Interior painting for the entire home.', descriptionHi: 'पूरे घर की भीतरी पुताई।' },
      { slug: 'wall-patch-putty', name: 'Wall patch and putty', nameHi: 'दीवार पैच और पुट्टी', description: 'Cracks, holes, and damp patches repaired.', descriptionHi: 'दरारें, छेद और नमी के धब्बे ठीक करना।' },
      { slug: 'exterior-touch-up', name: 'Exterior touch-up', nameHi: 'बाहरी रंग-रोगन', description: 'Weather-worn exterior walls refreshed.', descriptionHi: 'मौसम से खराब बाहरी दीवारों को नया रंग।' },
    ],
  },
  {
    category: 'Pest Control',
    categoryHi: 'कीट नियंत्रण',
    priceRange: [700, 2500],
    items: [
      { slug: 'cockroach-treatment', name: 'Cockroach treatment', nameHi: 'कॉकरोच उपचार', description: 'Kitchen and bathroom gel treatment.', descriptionHi: 'रसोई और बाथरूम में जेल उपचार।' },
      { slug: 'termite-treatment', name: 'Termite treatment', nameHi: 'दीमक उपचार', description: 'Wood and wall termite control.', descriptionHi: 'लकड़ी और दीवार में दीमक नियंत्रण।' },
      { slug: 'bed-bug-treatment', name: 'Bed bug treatment', nameHi: 'खटमल उपचार', description: 'Mattress and furniture bed bug removal.', descriptionHi: 'गद्दे और फर्नीचर से खटमल सफाई।' },
      { slug: 'rodent-control', name: 'Rodent control', nameHi: 'चूहा नियंत्रण', description: 'Traps and entry-point sealing for rodents.', descriptionHi: 'चूहों के लिए ट्रैप और प्रवेश बंद करना।' },
    ],
  },
];

// Deterministic spread instead of Math.random so reseeding never churns prices.
// Step of 10 keeps every price on a readable round figure.
function priceFor(slug, [min, max]) {
  let hash = 0;
  for (const char of slug) {
    hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  }
  const steps = Math.floor((max - min) / 10);
  return min + (hash % (steps + 1)) * 10;
}

const services = CATEGORIES.flatMap(({ category, categoryHi, priceRange, items }) =>
  items.map((item) => ({
    ...item,
    category,
    categoryHi,
    basePrice: priceFor(item.slug, priceRange),
    isActive: true,
  }))
);

const slugs = new Set(services.map((service) => service.slug));
if (slugs.size !== services.length) {
  throw new Error('Service catalog contains duplicate slugs');
}

module.exports = { services };
