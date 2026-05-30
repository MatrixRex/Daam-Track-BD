/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const UI_TRANSLATIONS = {
  en: {
    // Navigation / Header
    brandName: "দাম কত",
    brandFallback: "DaamKoto",
    subtitle: "Bangladeshi Commodity Price Tracker",
    exportAs: "Export As",
    exportComparison: "Export Comparison",
    addItemsToExport: "Add items to the comparison list to enable export.",
    addItemsToEnableExport: "Add items to enable export options.",
    imagePng: "Image (PNG)",
    excelXlsx: "Excel (XLSX)",
    csvFile: "CSV File",
    jsonData: "JSON Data",
    copyImage: "Copy Image to Clipboard",
    copyDataTsv: "Copy Data (TSV) to Clipboard",
    copyCsv: "Copy CSV to Clipboard",
    copyJson: "Copy JSON to Clipboard",
    quickActions: "Quick Actions",
    devTools: "Dev Tools & Controls",
    themeLight: "Switch to light mode",
    themeDark: "Switch to dark mode",
    itemsTracked: "ITEMS",
    clearAll: "Clear All",
    turnSortOff: "Turn sort off",
    sortByPrice: "Sort by price",
    lowestFirst: "Lowest first",
    highestFirst: "Highest first",
    details: "Details",
    clearDetails: "Clear details",
    clearSelectedDate: "Clear selected date",
    pricesOnDate: "Prices",
    clickToChangeDate: "Click to change date",
    noDataExport: "No data available to export",
    imageCopied: "Image copied to clipboard",
    imageDownload: "Image download started",
    imageExportFailed: "Failed to export image",
    jsonCopied: "JSON data copied to clipboard",
    jsonDownload: "JSON download started",
    csvCopied: "CSV data copied to clipboard",
    csvDownload: "CSV download started",
    excelCopied: "Excel-compatible data copied to clipboard",
    
    // Command Bar
    normalizeUnits: "Normalize Units",
    resetUnits: "Reset Units",
    dragAdjust: "Drag horizontally to adjust, tap to type",
    weight: "Weight",
    volume: "Volume",
    count: "Count",
    
    // Search Bar
    searchPlaceholder: "Search for eggs, rice, beef...",
    loadingProducts: "Loading products...",
    selected: "Selected",
    latest: "Latest",
    viewDetails: "View Details",
    noItemsFound: 'No items found for "{query}"',
    
    // Empty State
    comparePricesTitle: "Compare Prices & Trends",
    comparePricesDesc: "Select items from the search bar to visualize their price history, compare trends, and make smarter buying decisions.",
    tryRice: 'Try "Rice"',
    tryEgg: 'Try "Egg"',
    tryOnion: 'Try "Onion"',
    
    // Insights
    productInsights: "Product Insights",
    insightsDesc: "Select any item from the comparison list to view detailed performance metrics, history, and specifications.",
    baseUnit: "Base Unit",
    currentPrice: "Current Market Price",
    increase: "Increase",
    savings: "Savings",
    noChange: "No change",
    historicLow: "Historic Low",
    historicHigh: "Historic High",
    
    // Selected Date
    priceOnDateLabel: "Price on Date",
    up: "Up",
    down: "Down",
    noPriceData: "No price data",
    
    // Stats Sidebar
    compareProducts: "Compare Products",
    sidebarDesc: "Search and select items to see their live stats and comparison.",
    currentAbbr: "Cur"
  },
  bn: {
    // Navigation / Header
    brandName: "দাম কত",
    brandFallback: "DaamKoto",
    subtitle: "বাংলাদেশ নিত্যপ্রয়োজনীয় পণ্যের মূল্য ট্র্যাকার",
    exportAs: "এক্সপোর্ট করুন",
    exportComparison: "তুলনা এক্সপোর্ট করুন",
    addItemsToExport: "এক্সপোর্ট করতে তুলনা তালিকায় পণ্য যোগ করুন।",
    addItemsToEnableExport: "এক্সপোর্ট অপশন চালু করতে পণ্য যোগ করুন।",
    imagePng: "ছবি (PNG)",
    excelXlsx: "এক্সেল (XLSX)",
    csvFile: "সিএসভি ফাইল (CSV)",
    jsonData: "জেসন ডাটা (JSON)",
    copyImage: "ক্লিপবোর্ডে ছবি কপি করুন",
    copyDataTsv: "ক্লিপবোর্ডে ডাটা কপি করুন (TSV)",
    copyCsv: "ক্লিপবোর্ডে CSV কপি করুন",
    copyJson: "ক্লিপবোর্ডে JSON কপি করুন",
    quickActions: "দ্রুত অ্যাকশন",
    devTools: "ডেভ টুলস ও কন্ট্রোল",
    themeLight: "লাইট মোড চালু করুন",
    themeDark: "ডার্ক মোড চালু করুন",
    itemsTracked: "পণ্য",
    clearAll: "সব মুছুন",
    turnSortOff: "সর্ট বন্ধ করুন",
    sortByPrice: "দাম অনুযায়ী সাজান",
    lowestFirst: "কম দাম আগে",
    highestFirst: "বেশি দাম আগে",
    details: "বিস্তারিত",
    clearDetails: "বিস্তারিত মুছুন",
    clearSelectedDate: "নির্বাচিত তারিখ মুছুন",
    pricesOnDate: "মূল্য তালিকা",
    clickToChangeDate: "তারিখ পরিবর্তন করতে ক্লিক করুন",
    noDataExport: "এক্সপোর্ট করার জন্য কোনো তথ্য নেই",
    imageCopied: "ছবি ক্লিপবোর্ডে কপি করা হয়েছে",
    imageDownload: "ছবি ডাউনলোড শুরু হয়েছে",
    imageExportFailed: "ছবি এক্সপোর্ট করতে ব্যর্থ হয়েছে",
    jsonCopied: "জেসন ডাটা ক্লিপবোর্ডে কপি করা হয়েছে",
    jsonDownload: "জেসন ডাটা ডাউনলোড শুরু হয়েছে",
    csvCopied: "সিএসভি ডাটা ক্লিপবোর্ডে কপি করা হয়েছে",
    csvDownload: "সিএসভি ডাউনলোড শুরু হয়েছে",
    excelCopied: "এক্সেল-সামঞ্জস্যপূর্ণ ডাটা ক্লিপবোর্ডে কপি করা হয়েছে",
    
    // Command Bar
    normalizeUnits: "পরিমাপ সমান করুন",
    resetUnits: "পরিমাপ রিসেট করুন",
    dragAdjust: "পরিবর্তন করতে ডানে-বামে টানুন, টাইপ করতে ট্যাপ করুন",
    weight: "ওজন",
    volume: "আয়তন",
    count: "সংখ্যা",
    
    // Search Bar
    searchPlaceholder: "eggs, rice, beef খুঁজুন...",
    loadingProducts: "পণ্য লোড হচ্ছে...",
    selected: "নির্বাচিত",
    latest: "সর্বশেষ",
    viewDetails: "বিস্তারিত দেখুন",
    noItemsFound: '"{query}" এর জন্য কোনো পণ্য পাওয়া যায়নি',
    
    // Empty State
    comparePricesTitle: "মূল্য ও ট্রেন্ড তুলনা করুন",
    comparePricesDesc: "পণ্যসমূহের দামের ইতিহাস দেখতে, মূল্য বৃদ্ধির গতিবিধি ট্র্যাক করতে এবং সঠিক কেনাকাটার সিদ্ধান্ত নিতে সার্চবার থেকে পণ্য নির্বাচন করুন।",
    tryRice: 'খুঁজুন "Rice"',
    tryEgg: 'খুঁজুন "Egg"',
    tryOnion: 'খুঁজুন "Onion"',
    
    // Insights
    productInsights: "পণ্য বিশ্লেষণ",
    insightsDesc: "পণ্যের বিস্তারিত মূল্য তালিকা, ইতিহাস এবং পরিমাপ দেখতে তুলনা তালিকা থেকে যেকোনো পণ্য নির্বাচন করুন।",
    baseUnit: "মূল পরিমাপ",
    currentPrice: "বর্তমান বাজার দর",
    increase: "বৃদ্ধি",
    savings: "সাশ্রয়",
    noChange: "পরিবর্তনহীন",
    historicLow: "সর্বনিম্ন দাম",
    historicHigh: "সর্বোচ্চ দাম",
    
    // Selected Date
    priceOnDateLabel: "তারিখের মূল্য",
    up: "বেশি",
    down: "কম",
    noPriceData: "কোনো মূল্য তথ্য নেই",
    
    // Stats Sidebar
    compareProducts: "পণ্য তুলনা করুন",
    sidebarDesc: "পণ্যের লাইভ দাম ও তুলনা দেখতে সার্চ করে পণ্য যুক্ত করুন।",
    currentAbbr: "বর্তমান"
  }
};

const CATEGORY_TRANSLATIONS = {
  'fruits': 'ফলমূল',
  'vegetables': 'শাকসবজি',
  'eggs': 'ডিম',
  'meat': 'মাংস',
  'fish': 'মাছ',
  'rice': 'চাল',
  'dal': 'ডাল',
  'oil': 'তেল',
  'spices': 'মসলা',
  'dairy': 'দুগ্ধজাত পণ্য',
  'cleaning': 'পরিষ্কারক সামগ্রী',
  'personal care': 'ব্যক্তিগত যত্ন',
  'grocery': 'মুদি পণ্য',
  'snacks': 'নাস্তা',
  'beverages': 'পানীয়'
};

const UNIT_TRANSLATIONS = {
  '1 kg': '১ কেজি',
  'kg': 'কেজি',
  '1 dozen': '১ ডজন',
  'dozen': 'ডজন',
  'each': 'টি',
  '100 pcs': '১০০ টি',
  'pcs': 'টি',
  'pc': 'টি',
  'bundle': 'আঁটি',
  '4 pcs': '৪ টি',
  '12 pcs': '১২ টি',
  '1 liter': '১ লিটার',
  'liter': 'লিটার',
  '500 ml': '৫০০ মিলি',
  '250 ml': '২৫০ মিলি',
  'ml': 'মিলি',
  '200 gm': '২০০ গ্রাম',
  '150 gm': '১৫০ গ্রাম',
  'gm': 'গ্রাম',
  '380 ml': '৩৮০ মিলি',
  '400 gm': '৪০০ গ্রাম',
  '100 gm': '১০০ গ্রাম',
  '1 pack': '১ প্যাকেট',
  'pack': 'প্যাকেট',
  '8 pack': '৮ প্যাকেট',
  '1 bar': '১ টি (বার)',
  'bar': 'টি (বার)'
};

const PRODUCT_TRANSLATIONS = {
  // Fruits
  "Green Apple": "সবুজ আপেল",
  "Malta (Imported)": "মাল্টা (আমদানিকৃত)",
  "Banana (Sagor)": "কলা (সাগর)",
  "Pineapple": "আনারস",
  "Watermelon": "তরমুজ",
  "Guava": "পেয়ারা",
  "Pomegranate": "ডালিম",
  "Orange (Sweet)": "কমলা (মিষ্টি)",
  "Papaya": "পেঁপে",
  "Mango (Langra)": "আম (ল্যাংড়া)",
  "Lychee": "লিচু",
  "Dragon Fruit": "ড্রাগন ফল",

  // Vegetables
  "Potato (Regular)": "আলু (সাধারণ)",
  "Tomato": "টমেটো",
  "Onion (Local)": "পেঁয়াজ (দেশী)",
  "Onion (Imported)": "পেঁয়াজ (আমদানিকৃত)",
  "Garlic (Local)": "রসুন (দেশী)",
  "Ginger": "আদা",
  "Green Chili": "কাঁচা মরিচ",
  "Eggplant (Long)": "বেগুন (লম্বা)",
  "Cucumber": "শসা",
  "Cauliflower": "ফুলকপি",
  "Cabbage": "বাঁধাকপি",
  "Spinach": "পালং শাক",
  "Carrot": "গাজর",
  "Lemon": "লেবু",

  // Eggs & Meat
  "Egg (Chicken)": "ডিম (মুরগি)",
  "Egg (Duck)": "ডিম (হাঁস)",
  "Beef (Bone In)": "গরুর মাংস (হাড়সহ)",
  "Beef (Boneless)": "গরুর মাংস (হাড় ছাড়া)",
  "Chicken (Broiler)": "মুরগি (ব্রয়লার)",
  "Chicken (Sonali)": "মুরগি (সোনালী)",
  "Chicken (Local)": "মুরগি (দেশী)",
  "Mutton": "খাসির মাংস",

  // Fish
  "Hilsha Fish": "ইলিশ মাছ",
  "Rui Fish": "রুই মাছ",
  "Katla Fish": "কাতলা মাছ",
  "Tilapia": "তেলাপিয়া",
  "Pangash": "পাঙ্গাশ",
  "Shrimp (Bagda)": "চিংড়ি (বাগদা)",
  "Shrimp (Galda)": "চিংড়ি (গলদা)",
  "Dried Fish (Shutki)": "শুটকি মাছ",

  // Rice & Grains
  "Miniket Rice": "মিনিকেট চাল",
  "Nazirshail Rice": "নাজিরশাইল চাল",
  "Basmati Rice": "বাসমতী চাল",
  "Chinigura Rice": "চিনিগুঁড়া চাল",
  "Paizam Rice": "পাইজাম চাল",
  "Lentil (Mosur)": "মসুর ডাল",
  "Lentil (Mug)": "মুগ ডাল",
  "Chickpeas (Chola)": "ছোলা",

  // Oil & Spices
  "Soybean Oil": "সয়াবিন তেল",
  "Mustard Oil": "সরিষার তেল",
  "Olive Oil": "অলিভ অয়েল",
  "Turmeric Powder": "হলুদ গুঁড়া",
  "Chili Powder": "মরিচ গুঁড়া",
  "Cumin Seeds": "জিরা",
  "Coriander Powder": "ধনিয়া গুঁড়া",

  // Dairy
  "Milk (Liquid)": "দুধ (তরল)",
  "Powder Milk": "গুঁড়া দুধ",
  "Butter": "মাখন",
  "Cheese": "পনির",
  "Yogurt": "দই",

  // Cleaning & Personal Care
  "Dishwashing Liquid": "ডিশওয়াশিং লিকুইড",
  "Laundry Detergent": "ডিটারজেন্ট পাউডার",
  "Floor Cleaner": "ফ্লোর ক্লিনার",
  "Toilet Cleaner": "টয়লেট ক্লিনার",
  "Hand Wash": "হ্যান্ড ওয়াশ",
  "Bath Soap": "গোসলের সাবান",
  "Shampoo": "শ্যাম্পু",
  "Toothpaste": "টুথপেস্ট",

  // Grocery & Others
  "Sugar": "চিনি",
  "Salt": "লবণ",
  "Tea Leaves": "চা পাতা",
  "Coffee": "কফি",
  "Biscuits (Pack)": "বিস্কুট (প্যাকেট)",
  "Noodles": "নুডলস",
  "Chips": "চিপস",
  "Chocolate Bar": "চকলেট বার",
  "Soft Drink": "কোমল পানীয়",
  "Water": "पानी"
};

const MONTHS_EN_TO_BN = {
  'Jan': 'জানু', 'Feb': 'ফেব্রু', 'Mar': 'মার্চ', 'Apr': 'এপ্রিল', 'May': 'মে', 'Jun': 'জুন',
  'Jul': 'জুলাই', 'Aug': 'আগস্ট', 'Sep': 'সেপ্টে', 'Oct': 'অক্টো', 'Nov': 'নভে', 'Dec': 'ডিসে',
  'January': 'জানুয়ারি', 'February': 'ফেব্রুয়ারি', 'March': 'মার্চ', 'April': 'এপ্রিল',
  'June': 'জুন', 'July': 'জুলাই', 'August': 'আগস্ট', 'September': 'সেপ্টেম্বর',
  'October': 'অক্টোবর', 'November': 'নভেম্বর', 'December': 'ডিসেম্বর'
};

export function convertToBanglaNumerals(num) {
  if (num === null || num === undefined) return '';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (digit) => banglaDigits[digit]);
}

export function translateDate(dateStr, lang) {
  if (lang !== 'bn' || !dateStr) return dateStr;
  let translated = dateStr;
  Object.entries(MONTHS_EN_TO_BN).forEach(([en, bn]) => {
    translated = translated.replace(new RegExp(en, 'g'), bn);
  });
  translated = convertToBanglaNumerals(translated);
  return translated;
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    if (saved) return saved;
    // Default to 'bn'
    return 'bn';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key, params = {}) => {
    const dict = UI_TRANSLATIONS[language] || UI_TRANSLATIONS['en'];
    let text = dict[key] || UI_TRANSLATIONS['en'][key] || key;
    
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      text = text.replace(`{${paramKey}}`, paramValue);
    });
    
    return text;
  };

  const tProduct = (name) => {
    if (language !== 'bn') return name;
    return PRODUCT_TRANSLATIONS[name] || name;
  };

  const tCategory = (cat) => {
    if (language !== 'bn') return cat;
    const catKey = (cat || '').toLowerCase();
    return CATEGORY_TRANSLATIONS[catKey] || cat;
  };

  const tUnit = (unit) => {
    if (language !== 'bn') return unit;
    return UNIT_TRANSLATIONS[unit] || unit;
  };

  const formatPrice = (price) => {
    if (language === 'bn') {
      return convertToBanglaNumerals(price);
    }
    return price;
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      tProduct, 
      tCategory, 
      tUnit, 
      formatPrice,
      translateDate: (d) => translateDate(d, language)
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
