export type ExpenseCategory =
  | 'Food & Dining'
  | 'Travel & Transport'
  | 'Entertainment'
  | 'Shopping'
  | 'Health & Medical'
  | 'Utilities & Bills'
  | 'Transfers'
  | 'Other';

export const ALL_CATEGORIES: ExpenseCategory[] = [
  'Food & Dining',
  'Travel & Transport',
  'Entertainment',
  'Shopping',
  'Health & Medical',
  'Utilities & Bills',
  'Transfers',
  'Other',
];

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  'Food & Dining': '#6ee7b7',
  'Travel & Transport': '#67e8f9',
  'Entertainment': '#c4b5fd',
  'Shopping': '#fca5a5',
  'Health & Medical': '#86efac',
  'Utilities & Bills': '#fcd34d',
  'Transfers': '#93c5fd',
  'Other': '#d1d5db',
};

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  'Food & Dining': '🍽️',
  'Travel & Transport': '🚗',
  'Entertainment': '🎬',
  'Shopping': '🛍️',
  'Health & Medical': '💊',
  'Utilities & Bills': '⚡',
  'Transfers': '💸',
  'Other': '📦',
};

const KEYWORD_MAP: Record<ExpenseCategory, string[]> = {
  'Food & Dining': [
    'swiggy', 'zomato', 'dominos', 'pizza', 'mcdonald', 'kfc', 'burger', 'subway',
    'dunkin', 'starbucks', 'cafe', 'restaurant', 'food', 'dining', 'eat', 'biryani',
    'hotel', 'dhaba', 'bakery', 'juice', 'chai', 'tea', 'coffee', 'barbeque',
    'barbeque nation', 'haldiram', 'amul', 'milk', 'grocery', 'bigbasket', 'blinkit',
    'zepto', 'instamart', 'dunzo', 'grofers', 'jiomart', 'dmart', 'reliance fresh',
    'more supermarket', 'nature basket', 'spencers', 'licious', 'fresho', 'ninjacart',
    'box8', 'faasos', 'freshmenu', 'eatfit', 'rebel foods', 'behrouz', 'oven story',
  ],
  'Travel & Transport': [
    'ola', 'uber', 'rapido', 'irctc', 'railway', 'train', 'flight', 'airline',
    'indigo', 'spicejet', 'air india', 'vistara', 'goair', 'akasa', 'bus', 'metro',
    'bmtc', 'best bus', 'redbus', 'abhibus', 'makemytrip', 'goibibo', 'yatra',
    'cleartrip', 'ixigo', 'oyo', 'hotel booking', 'airbnb', 'petrol', 'fuel',
    'hp petrol', 'indian oil', 'bharat petroleum', 'fastag', 'toll', 'parking',
    'cab', 'taxi', 'auto', 'rickshaw', 'namma yatri', 'bluemart', 'bounce',
    'yulu', 'vogo', 'drivezy', 'zoomcar', 'myles',
  ],
  'Entertainment': [
    'netflix', 'amazon prime', 'hotstar', 'disney', 'zee5', 'sonyliv', 'voot',
    'jiocinema', 'mxplayer', 'youtube premium', 'spotify', 'gaana', 'jiosaavn',
    'wynk', 'apple music', 'bookmyshow', 'paytm movies', 'pvr', 'inox', 'cinepolis',
    'carnival cinemas', 'movie', 'cinema', 'theatre', 'concert', 'event', 'gaming',
    'steam', 'playstation', 'xbox', 'nintendo', 'pubg', 'battlegrounds', 'ludo',
    'dream11', 'mpl', 'winzo', 'fantasy', 'sports', 'gym', 'fitness', 'cult.fit',
    'cure.fit', 'fitternity', 'gold gym',
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'snapdeal',
    'shopclues', 'tatacliq', 'reliance digital', 'croma', 'vijay sales', 'poorvika',
    'apple store', 'samsung', 'oneplus', 'mi store', 'realme', 'oppo', 'vivo',
    'clothing', 'fashion', 'apparel', 'shoes', 'footwear', 'accessories', 'jewellery',
    'tanishq', 'kalyan', 'malabar', 'lifestyle', 'westside', 'pantaloons', 'max fashion',
    'h&m', 'zara', 'uniqlo', 'fabindia', 'biba', 'w for woman', 'global desi',
    'pepperfry', 'urban ladder', 'ikea', 'home centre', 'hometown',
  ],
  'Health & Medical': [
    'apollo', 'medplus', 'netmeds', 'pharmeasy', '1mg', 'tata 1mg', 'practo',
    'lybrate', 'healthkart', 'doctor', 'hospital', 'clinic', 'pharmacy', 'medicine',
    'diagnostic', 'lab', 'thyrocare', 'dr lal', 'metropolis', 'srl diagnostics',
    'max hospital', 'fortis', 'manipal', 'narayana', 'aiims', 'medanta', 'columbia asia',
    'insurance', 'health insurance', 'star health', 'niva bupa', 'care health',
    'aditya birla health', 'hdfc ergo health', 'icici lombard health',
  ],
  'Utilities & Bills': [
    'electricity', 'water', 'gas', 'broadband', 'internet', 'wifi', 'airtel',
    'jio', 'vodafone', 'vi', 'bsnl', 'mtnl', 'recharge', 'mobile recharge',
    'dth', 'tata sky', 'dish tv', 'sun direct', 'd2h', 'videocon d2h',
    'municipal', 'property tax', 'maintenance', 'society', 'rent', 'emi',
    'loan', 'insurance premium', 'lic', 'sbi life', 'hdfc life', 'icici prudential',
    'bajaj allianz', 'max life', 'kotak life', 'tata aia', 'credit card bill',
    'utility', 'bill payment', 'bbps',
  ],
  'Transfers': [
    'transfer', 'sent to', 'received from', 'upi transfer', 'neft', 'rtgs', 'imps',
    'bank transfer', 'wallet', 'paytm wallet', 'phonepe wallet', 'gpay', 'google pay',
    'bhim', 'cashback', 'refund', 'reversal', 'self transfer', 'own account',
    'savings', 'fd', 'rd', 'mutual fund', 'zerodha', 'groww', 'upstox', 'angel broking',
    'icicidirect', 'hdfc securities', 'kotak securities', 'motilal oswal',
  ],
  'Other': [],
};

export function categorizeTransaction(merchant: string): ExpenseCategory {
  const lower = merchant.toLowerCase();

  for (const [category, keywords] of Object.entries(KEYWORD_MAP) as [ExpenseCategory, string[]][]) {
    if (category === 'Other') continue;
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  return 'Other';
}
