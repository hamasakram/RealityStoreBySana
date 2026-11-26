// Catalogue + procedural product artwork.
// Every product has a `model` that both the SVG artwork and the AR engine understand.
// zone decides the tracker: head/face -> face tracker, hands -> hand tracker, body/feet -> pose tracker.

// ---------------- PREVIEW / VOTING MODE ----------------
// While PREVIEW.on is true the store shows ONE product per category, has no buying, and asks visitors to
// try on and vote. Swap the ids in `lineup` when new test products arrive; set on:false to open the real shop.
export const PREVIEW = {
  on: true,
  lineup: {
    hats: 'navy-slouchy-ribbed-beanie',
    sunglasses: 'black-metal-aviator',
    jackets: 'navy-quilted-puffer-jacket',
    gloves: 'charcoal-knit-gloves',
    shoes: ['black-neon-mid-trainer', 'black-logo-slides'],   // two footwear styles in the test
    socks: 'charcoal-cotton-crew-socks',
  },
};

export const ZONES = [
  { id: 'head', label: 'Head', blurb: 'Hats & caps', cats: ['hats'] },
  { id: 'face', label: 'Face', blurb: 'Sunglasses', cats: ['sunglasses'] },
  { id: 'hands', label: 'Hands', blurb: 'Gloves', cats: ['gloves'] },
  { id: 'body', label: 'Body', blurb: 'Jackets', cats: ['jackets'] },
  { id: 'feet', label: 'Feet', blurb: 'Shoes & socks', cats: ['shoes', 'socks'] },
];

export const CATEGORIES = [
  { id: 'hats', label: 'Hats & caps', zone: 'head' },
  { id: 'sunglasses', label: 'Sunglasses', zone: 'face' },
  { id: 'jackets', label: 'Jackets', zone: 'body' },
  { id: 'gloves', label: 'Gloves', zone: 'hands' },
  { id: 'shoes', label: 'Shoes', zone: 'feet' },
  { id: 'socks', label: 'Socks', zone: 'feet' },
];

// How well live try-on works today for each zone (shown honestly in the UI)
export const AR_LEVEL = {
  head: { label: 'Live 3D try-on', tip: 'Face the camera in good light.' },
  face: { label: 'Live 3D try-on', tip: 'Face the camera in good light.' },
  hands: { label: 'Live try-on', tip: 'Hold your hand up, palm or back to the camera.' },
  body: { label: 'Live preview', tip: 'Step back so your shoulders and hips are in frame.' },
  feet: { label: 'Live preview · beta', tip: 'Lean the phone low, step back until your whole body and feet are in frame.' },
};

const C = (name, hex) => ({ name, hex });

export const PRODUCTS = [
  // ---------- HATS ----------
  { id: 'nova-bucket-hat', name: 'Nova Bucket Hat', category: 'hats', zone: 'head', model: 'bucket', price: 3499, compareAt: 4200,
    colors: [C('Electric Violet', '#7C5CFF'), C('Ink', '#1C1F3F'), C('Sand', '#D8C3A0'), C('Cherry', '#C9324A')], sizes: ['S', 'M', 'L'],
    rating: 4.8, reviews: 126, badge: 'Bestseller', tags: ['new', 'trending'],
    desc: 'A soft cotton-twill bucket hat with a slightly downturned brim and a contrast band. Packs flat, keeps its shape.',
    features: ['100% cotton twill', 'Contrast grosgrain band', 'Stitched 6 cm brim', 'Breathable eyelets'] },
  { id: 'orbit-snapback', name: 'Orbit Snapback Cap', category: 'hats', zone: 'head', model: 'cap', price: 2799,
    colors: [C('Midnight', '#20244F'), C('Violet', '#6A4DF0'), C('Bone', '#ECE6DA'), C('Forest', '#2E5A43')], sizes: ['One size'],
    rating: 4.6, reviews: 88, tags: ['trending'],
    desc: 'Structured six-panel cap with a curved visor and adjustable snap closure.',
    features: ['Structured front panels', 'Pre-curved visor', 'Adjustable snap back', 'Embroidered eyelets'] },
  { id: 'drift-beanie', name: 'Drift Rib Beanie', category: 'hats', zone: 'head', model: 'beanie', price: 1899,
    colors: [C('Charcoal', '#3A3D4E'), C('Lilac', '#A894FF'), C('Rust', '#B5532E'), C('Snow', '#F2F2F5')], sizes: ['One size'],
    rating: 4.7, reviews: 203,
    desc: 'Chunky rib-knit beanie with a fold-over cuff. Warm without the itch.',
    features: ['Merino-acrylic blend', 'Fold-over cuff', 'Stretch rib knit', 'Machine washable'] },
  { id: 'luxe-fedora', name: 'Luxe Wool Fedora', category: 'hats', zone: 'head', model: 'fedora', price: 5999,
    colors: [C('Camel', '#A77B4F'), C('Black', '#17181F'), C('Grey', '#7E808F')], sizes: ['S', 'M', 'L'],
    rating: 4.5, reviews: 41, tags: ['new'],
    desc: 'Pure wool felt fedora with a pinched crown and leather-look band.',
    features: ['100% wool felt', 'Teardrop pinched crown', '7 cm brim', 'Satin lining'] },

  // ---------- SUNGLASSES ----------
  { id: 'orbit-shades', name: 'Orbit Round Shades', category: 'sunglasses', zone: 'face', model: 'round', price: 4250,
    colors: [C('Gloss Black', '#111318'), C('Gold', '#C9A45C'), C('Violet', '#7C5CFF')], lens: '#1B1530', sizes: ['One size'],
    rating: 4.8, reviews: 154, badge: 'Bestseller', tags: ['trending'],
    desc: 'Round metal frames with polarised UV400 lenses. Light on the nose, big on attitude.',
    features: ['UV400 polarised lenses', 'Lightweight metal frame', 'Adjustable nose pads', 'Hard case included'] },
  { id: 'apex-aviator', name: 'Apex Aviator', category: 'sunglasses', zone: 'face', model: 'aviator', price: 5490,
    colors: [C('Gold', '#C9A45C'), C('Gunmetal', '#5A5E6E'), C('Silver', '#C8CAD4')], lens: '#2B3A2A', sizes: ['One size'],
    rating: 4.7, reviews: 97, tags: ['new'],
    desc: 'Classic double-bridge aviator with gradient lenses.',
    features: ['Gradient lenses', 'Double bridge', 'Spring hinges', 'UV400'] },
  { id: 'vector-wayfarer', name: 'Vector Wayfarer', category: 'sunglasses', zone: 'face', model: 'wayfarer', price: 3990,
    colors: [C('Black', '#15161C'), C('Tortoise', '#6B3E22'), C('Clear Violet', '#9C86FF')], lens: '#141414', sizes: ['One size'],
    rating: 4.6, reviews: 211,
    desc: 'Bold acetate wayfarer that suits almost every face shape.',
    features: ['Hand-polished acetate', 'Polarised lenses', 'Five-barrel hinges', 'UV400'] },
  { id: 'lumi-cateye', name: 'Lumi Cat-Eye', category: 'sunglasses', zone: 'face', model: 'cateye', price: 4690,
    colors: [C('Cherry', '#B8243E'), C('Black', '#15161C'), C('Pearl', '#EDE7F2')], lens: '#2A1720', sizes: ['One size'],
    rating: 4.9, reviews: 63, tags: ['new', 'trending'],
    desc: 'Lifted cat-eye frame with gradient lenses and a glossy finish.',
    features: ['Glossy acetate', 'Gradient lenses', 'UV400', 'Microfibre pouch'] },

  // ---------- JACKETS ----------
  { id: 'gloss-bomber', name: 'Gloss Bomber Jacket', category: 'jackets', zone: 'body', model: 'bomber', price: 12900, compareAt: 14900,
    colors: [C('Violet', '#5B3DF5'), C('Black', '#15161C'), C('Olive', '#4E5A34')], sizes: ['S', 'M', 'L', 'XL'],
    rating: 4.7, reviews: 72, badge: 'New', tags: ['new', 'trending'],
    desc: 'High-shine nylon bomber with ribbed collar, cuffs and hem. Light padding for cool evenings.',
    features: ['Glossy nylon shell', 'Ribbed trims', 'Two-way zip', 'Inner phone pocket'] },
  { id: 'indigo-denim', name: 'Indigo Denim Jacket', category: 'jackets', zone: 'body', model: 'denim', price: 8900,
    colors: [C('Indigo', '#2E4A7D'), C('Washed Blue', '#6F8FBF'), C('Black', '#22232B')], sizes: ['S', 'M', 'L', 'XL'],
    rating: 4.6, reviews: 118,
    desc: 'Classic trucker-style denim jacket in a mid-weight stretch denim.',
    features: ['Stretch cotton denim', 'Button front', 'Chest flap pockets', 'Contrast stitching'] },
  { id: 'cloud-puffer', name: 'Cloud Puffer', category: 'jackets', zone: 'body', model: 'puffer', price: 15900,
    colors: [C('Lilac', '#A894FF'), C('Black', '#15161C'), C('Ice', '#DDE6F2')], sizes: ['S', 'M', 'L', 'XL'],
    rating: 4.8, reviews: 54, tags: ['trending'],
    desc: 'Box-quilted puffer with water-repellent shell and recycled insulation.',
    features: ['Water-repellent shell', 'Recycled fill', 'Box quilting', 'High collar'] },

  // ---------- GLOVES ----------
  { id: 'aurora-knit-gloves', name: 'Aurora Knit Gloves', category: 'gloves', zone: 'hands', model: 'knit', price: 1690,
    colors: [C('Lilac', '#A894FF'), C('Charcoal', '#3A3D4E'), C('Cream', '#EFE6D2')], sizes: ['S/M', 'L/XL'],
    rating: 4.6, reviews: 95, tags: ['new'],
    desc: 'Soft knit gloves with striped cuffs and touchscreen fingertips.',
    features: ['Touchscreen tips', 'Striped rib cuff', 'Soft acrylic-wool', 'Stretch fit'] },
  { id: 'noir-leather-gloves', name: 'Noir Leather Gloves', category: 'gloves', zone: 'hands', model: 'leather', price: 4990,
    colors: [C('Black', '#141519'), C('Cognac', '#8A4B22'), C('Burgundy', '#5E1A2B')], sizes: ['S', 'M', 'L'],
    rating: 4.8, reviews: 47,
    desc: 'Lambskin leather gloves with a fleece lining and a slim fit.',
    features: ['Lambskin leather', 'Fleece lining', 'Snap at wrist', 'Slim tailored fit'] },
  { id: 'grip-sport-gloves', name: 'Grip Sport Gloves', category: 'gloves', zone: 'hands', model: 'sport', price: 2490,
    colors: [C('Volt Black', '#1A1B22'), C('Violet', '#6A4DF0'), C('Red', '#C9324A')], sizes: ['S', 'M', 'L', 'XL'],
    rating: 4.5, reviews: 66, tags: ['trending'],
    desc: 'Lightweight training gloves with grippy palms and breathable backs.',
    features: ['Silicone grip palm', 'Mesh back', 'Velcro wrist strap', 'Washable'] },

  // ---------- SHOES ----------
  { id: 'pulse-runner', name: 'Pulse Runner', category: 'shoes', zone: 'feet', model: 'runner', price: 9800,
    colors: [C('Violet', '#7C5CFF'), C('White', '#ECEDF3'), C('Black', '#17181F')], sizes: ['39', '40', '41', '42', '43', '44'],
    rating: 4.7, reviews: 139, badge: 'Bestseller', tags: ['trending'],
    desc: 'Lightweight knit running shoe with a springy foam midsole.',
    features: ['Engineered knit upper', 'Responsive foam', 'Rubber outsole', 'Reflective heel'] },
  { id: 'summit-hightop', name: 'Summit High-Top', category: 'shoes', zone: 'feet', model: 'hightop', price: 11500,
    colors: [C('Black', '#17181F'), C('Bone', '#ECE6DA'), C('Lilac', '#A894FF')], sizes: ['39', '40', '41', '42', '43', '44'],
    rating: 4.6, reviews: 58, tags: ['new'],
    desc: 'Leather high-top sneaker with a padded collar and cupsole.',
    features: ['Leather upper', 'Padded ankle collar', 'Stitched cupsole', 'Cushioned insole'] },
  { id: 'regent-loafer', name: 'Regent Loafer', category: 'shoes', zone: 'feet', model: 'loafer', price: 10900,
    colors: [C('Black', '#141519'), C('Brown', '#6B3E22'), C('Wine', '#5E1A2B')], sizes: ['39', '40', '41', '42', '43', '44'],
    rating: 4.8, reviews: 33,
    desc: 'Polished leather penny loafer, hand-finished.',
    features: ['Polished calf leather', 'Leather lining', 'Blake-stitched sole', 'Penny strap'] },

  // ---------- SOCKS ----------
  { id: 'cloud-crew-socks', name: 'Cloud Crew Socks', category: 'socks', zone: 'feet', model: 'crew', price: 790,
    colors: [C('White', '#F2F2F5'), C('Violet', '#7C5CFF'), C('Black', '#1A1B22')], sizes: ['S', 'M', 'L'],
    rating: 4.7, reviews: 241, tags: ['trending'],
    desc: 'Cushioned cotton crew socks with a ribbed cuff and contrast heel.',
    features: ['Combed cotton', 'Cushioned sole', 'Arch support band', 'Pack of 1'] },
  { id: 'stripe-crew-socks', name: 'Stripe Crew Socks', category: 'socks', zone: 'feet', model: 'stripe', price: 890,
    colors: [C('Violet / Lilac', '#6A4DF0'), C('Red / White', '#C9324A'), C('Navy / Sky', '#22306B')], sizes: ['S', 'M', 'L'],
    rating: 4.6, reviews: 112, tags: ['new'],
    desc: 'Retro striped crew socks — the easiest way to add colour.',
    features: ['Retro stripes', 'Soft cotton blend', 'Reinforced toe', 'Pack of 1'] },
  { id: 'stealth-ankle-socks', name: 'Stealth Ankle Socks', category: 'socks', zone: 'feet', model: 'ankle', price: 650,
    colors: [C('Black', '#1A1B22'), C('Grey', '#8A8D9C'), C('White', '#F2F2F5')], sizes: ['S', 'M', 'L'],
    rating: 4.5, reviews: 187,
    desc: 'Low-cut ankle socks with a heel tab that stops them slipping.',
    features: ['Heel tab', 'Breathable mesh top', 'Cushioned sole', 'Pack of 1'] },
];

// ---------- Realistic test catalogue (generic, unbranded) ----------
// Standard sizing: caps by head circumference, sunglasses by lens-bridge-arm (mm),
// gloves by palm circumference, socks by EU/UK shoe size. Ratings start empty (no invented reviews).
const T = (o) => ({ rating: 0, reviews: 0, tags: ['new'], stock: 40, ...o });
PRODUCTS.push(
  // ---- HEAD ----
  T({ id: 'classic-cotton-baseball-cap', name: 'Classic Cotton Baseball Cap', category: 'hats', zone: 'head', model: 'cap', price: 1450,
    colors: [C('Black', '#111111'), C('Navy', '#1F2A44'), C('Khaki', '#C3B091'), C('White', '#F2F1EC'), C('Olive', '#556B2F')],
    sizes: ['S/M 55–57 cm', 'L/XL 58–60 cm'],
    desc: 'Everyday six-panel cap in brushed cotton twill with a pre-curved peak and an adjustable strap at the back.',
    features: ['100% brushed cotton twill', 'Six panels with stitched eyelets', 'Pre-curved 7 cm peak', 'Fits head circumference 55–60 cm'] }),
  T({ id: 'trucker-mesh-snapback', name: 'Trucker Mesh Snapback', category: 'hats', zone: 'head', model: 'cap', price: 1650,
    colors: [C('Black', '#151515'), C('Charcoal', '#36454F'), C('Royal Blue', '#2B4FA8'), C('Maroon', '#6D1F2E')],
    sizes: ['One size 56–61 cm'],
    desc: 'High-crown trucker cap with a foam front panel, breathable mesh back and plastic snap closure.',
    features: ['Foam front, polyester mesh back', 'Flat or curved peak', 'Snapback closure', 'Fits 56–61 cm'] }),
  T({ id: 'washed-denim-dad-cap', name: 'Washed Denim Dad Cap', category: 'hats', zone: 'head', model: 'cap', price: 1850,
    colors: [C('Light Wash', '#8EA9C8'), C('Mid Wash', '#5B7DA6'), C('Dark Wash', '#2F4A6B')],
    sizes: ['One size 55–60 cm'],
    desc: 'Low-profile unstructured cap in stone-washed denim with a brass buckle strap.',
    features: ['Stone-washed cotton denim', 'Unstructured low crown', 'Brass buckle strap', 'Fits 55–60 cm'] }),
  T({ id: 'reversible-cotton-bucket-hat', name: 'Reversible Cotton Bucket Hat', category: 'hats', zone: 'head', model: 'bucket', price: 1750,
    colors: [C('Black', '#141414'), C('Beige', '#D9C7A7'), C('Olive', '#5A6B3A'), C('Navy', '#1F2A44')],
    sizes: ['S/M 56–57 cm', 'L/XL 58–59 cm'],
    desc: 'Two hats in one: plain cotton on one side, a contrast colour on the other. Packs flat for travel.',
    features: ['100% cotton canvas', 'Reversible', '6 cm stitched brim', 'Sizes by head circumference'] }),
  T({ id: 'ribbed-knit-beanie', name: 'Ribbed Knit Beanie', category: 'hats', zone: 'head', model: 'beanie', price: 990,
    colors: [C('Black', '#141414'), C('Heather Grey', '#9A9A9A'), C('Mustard', '#D4A017'), C('Burgundy', '#6D1A36'), C('Navy', '#1F2A44')],
    sizes: ['One size 54–60 cm'],
    desc: 'Soft rib-knit beanie with a fold-over cuff — the winter basic for Lahore and Islamabad evenings.',
    features: ['Soft acrylic rib knit', 'Fold-over cuff', 'Stretches to 54–60 cm', 'Hand wash'] }),
  T({ id: 'panama-straw-fedora', name: 'Panama-Style Straw Fedora', category: 'hats', zone: 'head', model: 'fedora', price: 3200,
    colors: [C('Natural Straw', '#E3D3A8'), C('Ivory', '#F2EBDC'), C('Tan', '#C19A6B')],
    sizes: ['S 55 cm', 'M 57 cm', 'L 59 cm'],
    desc: 'Lightweight woven paper-straw fedora with a black grosgrain band — made for summer sun.',
    features: ['Woven paper straw', 'Black grosgrain band', '6 cm brim', 'Inner sweatband'] }),
  // ---- FACE ----
  T({ id: 'metal-aviator-58', name: 'Classic Metal Aviator 58 mm', category: 'sunglasses', zone: 'face', model: 'aviator', price: 3950,
    colors: [C('Gold', '#C9A45C'), C('Silver', '#C8CAD4'), C('Gunmetal', '#4A4D57')], lens: '#2F3B2A',
    sizes: ['58 mm', '62 mm'],
    desc: 'Teardrop metal aviator with polarised G-15 green lenses and adjustable nose pads.',
    features: ['Polarised G-15 lenses, UV400', 'Lens 58 mm · Bridge 14 mm · Arm 135 mm', 'Adjustable nose pads', 'Case and cleaning cloth'] }),
  T({ id: 'acetate-wayfarer-52', name: 'Acetate Square Wayfarer 52 mm', category: 'sunglasses', zone: 'face', model: 'wayfarer', price: 3450,
    colors: [C('Black', '#121212'), C('Tortoise', '#5C3A21'), C('Crystal Clear', '#D9DDE3')], lens: '#2B2B30',
    sizes: ['50 mm', '52 mm', '54 mm'],
    desc: 'Thick acetate square frame with smoke-grey polarised lenses — suits most face shapes.',
    features: ['Smoke grey polarised lenses, UV400', 'Lens 52 mm · Bridge 18 mm · Arm 145 mm', 'Five-barrel hinges', 'Hand-polished acetate'] }),
  T({ id: 'round-wire-sunglasses-49', name: 'Round Wire Sunglasses 49 mm', category: 'sunglasses', zone: 'face', model: 'round', price: 2950,
    colors: [C('Gold', '#C9A45C'), C('Matte Black', '#1A1A1A'), C('Rose Gold', '#B76E79')], lens: '#5A3B22',
    sizes: ['49 mm'],
    desc: 'Slim round wire frame with brown gradient lenses for a vintage look.',
    features: ['Brown gradient lenses, UV400', 'Lens 49 mm · Bridge 21 mm · Arm 145 mm', 'Silicone nose pads', 'Lightweight stainless steel'] }),
  T({ id: 'oversized-cat-eye-55', name: 'Oversized Cat-Eye 55 mm', category: 'sunglasses', zone: 'face', model: 'cateye', price: 3650,
    colors: [C('Black', '#141414'), C('Tortoise', '#5C3A21'), C('Nude Pink', '#D8B4A6')], lens: '#4A2E1E',
    sizes: ['55 mm'],
    desc: 'Bold lifted cat-eye in glossy acetate with brown gradient lenses.',
    features: ['Brown gradient lenses, UV400', 'Lens 55 mm · Bridge 17 mm · Arm 140 mm', 'Glossy acetate', 'Soft pouch included'] }),
  // ---- HANDS ----
  T({ id: 'touchscreen-knit-gloves', name: 'Touchscreen Knit Winter Gloves', category: 'gloves', zone: 'hands', model: 'knit', price: 950,
    colors: [C('Black', '#141414'), C('Charcoal Grey', '#4A4A4A'), C('Camel', '#C19A6B'), C('Maroon', '#6D1F2E')],
    sizes: ['S/M 18–20 cm', 'L/XL 21–23 cm'],
    desc: 'Warm stretch-knit gloves with conductive thumb and index tips so you can use your phone.',
    features: ['Touchscreen thumb and index tips', 'Stretch acrylic knit', 'Ribbed cuff', 'Size by palm circumference'] }),
  T({ id: 'leather-driving-gloves', name: 'Leather Driving Gloves', category: 'gloves', zone: 'hands', model: 'leather', price: 3450,
    colors: [C('Black', '#141414'), C('Tan', '#A0663C'), C('Dark Brown', '#4B2E1F')],
    sizes: ['S 17–19 cm', 'M 19–21 cm', 'L 21–23 cm', 'XL 23–25 cm'],
    desc: 'Unlined sheepskin driving gloves with a snap wrist and grip-friendly palm.',
    features: ['Genuine sheepskin leather', 'Snap wrist closure', 'Unlined for grip and feel', 'Size by palm circumference'] }),
  T({ id: 'motorbike-riding-gloves', name: 'Full-Finger Motorbike Riding Gloves', category: 'gloves', zone: 'hands', model: 'sport', price: 2250,
    colors: [C('Black', '#141414'), C('Black / Red', '#8B1E1E'), C('Black / Grey', '#555555')],
    sizes: ['M 19–21 cm', 'L 21–23 cm', 'XL 23–25 cm'],
    desc: 'Breathable riding gloves with hard knuckle guards and a padded palm for daily commutes.',
    features: ['Hard knuckle protection', 'Padded anti-slip palm', 'Mesh back for airflow', 'Hook-and-loop wrist strap'] }),
  T({ id: 'gym-training-gloves', name: 'Gym Training Gloves', category: 'gloves', zone: 'hands', model: 'sport', price: 1350,
    colors: [C('Black', '#141414'), C('Grey', '#6B6B6B'), C('Blue', '#1F4E8C')],
    sizes: ['S 17–19 cm', 'M 19–21 cm', 'L 21–23 cm'],
    desc: 'Grippy training gloves with silicone palm dots and a wrap wrist strap.',
    features: ['Silicone grip palm', 'Wrap-around wrist support', 'Breathable mesh back', 'Machine washable'] }),
  // ---- FEET (socks) ----
  T({ id: 'cotton-crew-socks-3', name: 'Cotton Crew Socks · Pack of 3', category: 'socks', zone: 'feet', model: 'crew', price: 899,
    colors: [C('White', '#F4F4F4'), C('Black', '#151515'), C('Heather Grey', '#A3A3A3')],
    sizes: ['EU 39–42 / UK 6–8', 'EU 43–46 / UK 9–11'],
    desc: 'Everyday combed-cotton crew socks with a cushioned sole and ribbed cuff. Three pairs, one colour.',
    features: ['80% combed cotton', 'Cushioned sole', 'Reinforced heel and toe', 'Pack of 3 pairs'] }),
  T({ id: 'ankle-sports-socks-3', name: 'Cushioned Ankle Sports Socks · Pack of 3', category: 'socks', zone: 'feet', model: 'ankle', price: 750,
    colors: [C('White', '#F4F4F4'), C('Black', '#151515'), C('Grey', '#8A8D9C')],
    sizes: ['EU 39–42 / UK 6–8', 'EU 43–46 / UK 9–11'],
    desc: 'Low-cut sports socks with a heel tab and arch band — made for trainers and the gym.',
    features: ['Terry-cushioned sole', 'Heel tab stops slipping', 'Arch support band', 'Pack of 3 pairs'] }),
  T({ id: 'striped-cotton-crew-socks', name: 'Striped Cotton Crew Socks', category: 'socks', zone: 'feet', model: 'stripe', price: 499,
    colors: [C('Navy / White', '#1F2A44'), C('Red / White', '#B22234'), C('Forest / Cream', '#2F5D46')],
    sizes: ['EU 35–38 / UK 2.5–5', 'EU 39–42 / UK 6–8', 'EU 43–46 / UK 9–11'],
    desc: 'Retro striped crew socks in soft cotton — one pair.',
    features: ['Soft cotton blend', 'Retro stripes', 'Ribbed cuff', '1 pair'] }),
  T({ id: 'merino-hiking-socks', name: 'Merino Wool Hiking Socks', category: 'socks', zone: 'feet', model: 'crew', price: 1450,
    colors: [C('Charcoal', '#36454F'), C('Olive', '#556B2F')],
    sizes: ['EU 39–42 / UK 6–8', 'EU 43–46 / UK 9–11'],
    desc: 'Warm, odour-resistant merino-blend socks with a cushioned footbed for long walks and northern trips.',
    features: ['60% merino wool', 'Full cushioned footbed', 'Odour resistant', '1 pair'] }),
);

// ---------- Supplier photo items (real product photos + photo-textured 3D try-on) ----------
PRODUCTS.push(
  T({ id: 'woolen-beret-hat', name: 'Woolen Beret Hat', category: 'hats', zone: 'head', model: 'beret', price: 1290,
    colors: [C('Oatmeal', '#C9B6A3')], sizes: ['One size 54–58 cm'],
    image: 'img/products/woolen-beret.jpg', arTex: { knit: 'img/products/woolen-beret-knit.jpg' },
    desc: 'Soft brushed-wool beret with a textured knit and a snug band — a classic French shape for winter outfits.',
    features: ['Brushed wool-blend knit', 'Snug elastic band', 'Wear straight or tilted', 'Fits head circumference 54–58 cm'] }),
  T({ id: 'girls-woolen-pompom-beanie', name: 'Girls Woolen Beanie Hat', category: 'hats', zone: 'head', model: 'pompom', price: 1490,
    colors: [C('Camel & Cream', '#DCCBB2')], sizes: ['Kids 3–7 yrs (48–52 cm)', 'Kids 8–12 yrs (52–54 cm)'],
    image: 'img/products/girls-pompom-beanie.jpg', arTex: { knit: 'img/products/girls-pompom-beanie-knit.jpg', fur: 'img/products/girls-pompom-beanie-fur.jpg' },
    desc: 'Rib-knit girls’ beanie with a faux-fur pom-pom, a jacquard band and warm ear flaps with pom-pom ties.',
    features: ['Soft rib knit with jacquard band', 'Faux-fur pom-pom on top', 'Ear flaps with pom-pom ties', 'Sized for children'] }),
  T({ id: 'green-woolen-beanie-hat', name: 'Woolen Beanie Hat', category: 'hats', zone: 'head', model: 'slouchy', price: 1190,
    colors: [C('Pistachio Green', '#A9D39A')], sizes: ['One size 54–60 cm'],
    image: 'img/products/green-woolen-beanie.jpg', arTex: { knit: 'img/products/green-woolen-beanie-knit.jpg' },
    desc: 'Relaxed slouchy beanie in a fluffy rib knit with a fold-back cuff.',
    features: ['Fluffy wool-blend rib knit', 'Slouchy fit with fold-back cuff', 'Stretches to 54–60 cm', 'Hand wash'] }),
);

// ---------- Preview line-up from the owner's supplier (photos supplied by the owner) ----------
// Names, sizes and expected prices are first drafts — the owner will confirm them.
PRODUCTS.push(
  T({ id: 'navy-slouchy-ribbed-beanie', name: 'Navy Slouchy Ribbed Beanie', category: 'hats', zone: 'head', model: 'slouchy', price: 1190,
    colors: [C('Navy', '#1F2A44')], sizes: ['One size 54–60 cm'],
    image: 'img/products/navy-slouchy-beanie.jpg', arTex: { knit: 'img/products/navy-slouchy-beanie-knit.jpg' },
    desc: 'Soft fine-rib beanie with a relaxed slouch at the back — easy to wear all winter.',
    features: ['Fine rib knit', 'Relaxed slouchy fit', 'Stretches to 54–60 cm', 'Hand wash'] }),
  T({ id: 'black-metal-aviator', name: 'Black Metal Aviator Sunglasses', category: 'sunglasses', zone: 'face', model: 'aviator', price: 2490,
    colors: [C('Black', '#1A1A1C')], lens: '#3A3B40', sizes: ['58 mm'],
    image: 'img/products/black-aviator.jpg',
    desc: 'Classic double-bridge aviator in a slim black metal frame with smoke-grey lenses.',
    features: ['Smoke grey lenses, UV400', 'Slim black metal frame', 'Double bridge', 'Adjustable nose pads'] }),
  T({ id: 'charcoal-knit-gloves', name: 'Charcoal Knit Gloves', category: 'gloves', zone: 'hands', model: 'knit', price: 890,
    colors: [C('Charcoal', '#3B3B3D')], sizes: ['S/M 18–20 cm', 'L/XL 21–23 cm'],
    image: 'img/products/charcoal-knit-gloves.jpg', arTex: { knit: 'img/products/charcoal-knit-gloves-knit.jpg' },
    desc: 'Warm marled-knit winter gloves with a snug ribbed cuff.',
    features: ['Marled stretch knit', 'Ribbed cuff', 'Full fingers', 'Size by palm circumference'] }),
  T({ id: 'charcoal-cotton-crew-socks', name: 'Charcoal Cotton Crew Socks', category: 'socks', zone: 'feet', model: 'crew', price: 450,
    colors: [C('Charcoal', '#3A3A3C')], sizes: ['EU 39–42 / UK 6–8', 'EU 43–46 / UK 9–11'],
    image: 'img/products/charcoal-crew-socks.jpg', arTex: { knit: 'img/products/charcoal-crew-socks-knit.jpg' },
    desc: 'Everyday marled cotton crew socks with a ribbed cuff.',
    features: ['Soft cotton blend', 'Ribbed cuff', 'Reinforced heel and toe', '1 pair'] }),
  T({ id: 'navy-quilted-puffer-jacket', name: 'Navy Quilted Puffer Jacket', category: 'jackets', zone: 'body', model: 'puffer', price: 6990,
    colors: [C('Navy', '#2C3344')], sizes: ['S', 'M', 'L', 'XL'],
    image: 'img/products/navy-puffer-jacket.jpg', arTex: { fabric: 'img/products/navy-puffer-jacket-fabric.jpg' },
    desc: 'Lightweight channel-quilted puffer with a stand collar, full zip and zip pockets.',
    features: ['Channel quilting', 'Stand-up collar', 'Full-length zip', 'Two zip hand pockets'] }),
);

// ---------- Footwear from the owner's supplier (with the supplier's size charts) ----------
const TRAINER_CHART = [['5','39','26'],['6','40','26.7'],['7','41','27.3'],['8','42','28'],['9','43','28.7'],['10','44','29.3'],['11','45','30']];
const SLIDE_CHART = [['36','23.4'],['37','24.1'],['38','24.8'],['39','25.4'],['40','26.1'],['41','26.7'],['42','27.4'],['43','28.1'],['44','28.7'],['45','29.4']];
PRODUCTS.push(
  T({ id: 'black-neon-mid-trainer', name: 'Black & Neon Mid-Top Trainer', category: 'shoes', zone: 'feet', model: 'hightop', price: 7990,
    colors: [C('Black / Neon Green', '#1E2022')], accent: '#9BE22D', sole: '#F2F2F0',
    sizes: TRAINER_CHART.map(([uk, eu, cm]) => `EU ${eu} · UK ${uk} (${cm} cm)`),
    sizeChart: { columns: ['UK', 'EU', 'Foot length (cm)'], rows: TRAINER_CHART, note: 'Measure your foot from heel to longest toe.' },
    image: 'img/products/black-neon-mid-trainer.jpg',
    desc: 'Mid-top trail-style trainer with a perforated black upper, padded ankle collar, neon-green accents and a cushioned white midsole.',
    features: ['Perforated textile upper', 'Padded mid-top collar with strap', 'Cushioned white midsole', 'Grippy rubber outsole'] }),
  T({ id: 'black-logo-slides', name: 'Black Logo Slides', category: 'shoes', zone: 'feet', model: 'slide', price: 1990,
    colors: [C('Black', '#141416')], accent: '#F2F2F0',
    sizes: SLIDE_CHART.map(([eu, cm]) => `EU ${eu} (${cm} cm)`),
    sizeChart: { columns: ['EU size', 'Foot length (cm)'], rows: SLIDE_CHART, note: 'Measure your foot from heel to longest toe.' },
    image: 'img/products/black-logo-slides.jpg',
    desc: 'Comfortable one-strap slides with a soft moulded footbed and a bold printed logo strap.',
    features: ['Soft moulded footbed', 'Wide padded strap with printed logo', 'Water-friendly', 'Easy slip-on'] }),
);

// ---------------- colour helpers ----------------
export function shade(hex, amt) {
  // amt -1..1 : negative darkens, positive lightens
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
export function isLight(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 160;
}

// ---------------- procedural SVG artwork ----------------
let gid = 0;
export function art(product, colorHex) {
  const c = colorHex || (product.colors && product.colors[0] && product.colors[0].hex) || '#7C5CFF';
  const id = 'g' + (++gid);
  const hi = shade(c, 0.45), mid = c, lo = shade(c, -0.45), lo2 = shade(c, -0.65);
  const lens = product.lens || '#1B1530';
  const defs = `<defs>
    <linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".5" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></linearGradient>
    <linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${lo}"/><stop offset=".45" stop-color="${mid}"/><stop offset=".7" stop-color="${hi}"/><stop offset="1" stop-color="${lo}"/></linearGradient>
    <linearGradient id="${id}l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(lens, 0.35)}"/><stop offset=".55" stop-color="${lens}"/><stop offset="1" stop-color="${shade(lens, -0.5)}"/></linearGradient>
    <radialGradient id="${id}r" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${hi}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></radialGradient>
  </defs>`;
  const V = `url(#${id}v)`, H = `url(#${id}h)`, L = `url(#${id}l)`, R = `url(#${id}r)`;
  const shine = 'rgba(255,255,255,.55)';
  let body = '';
  switch (product.model) {
    case 'bucket': body = `
      <path d="M22 128c14 16 142 16 156 0-6 18-40 30-78 30s-72-12-78-30z" fill="${lo}"/>
      <path d="M22 128c10-10 40-14 78-14s68 4 78 14c-14 12-142 12-156 0z" fill="${H}"/>
      <path d="M50 122c0-44 20-74 50-74s50 30 50 74c-30 8-70 8-100 0z" fill="${V}"/>
      <path d="M52 110c30 7 66 7 96 0v10c-30 8-66 8-96 0z" fill="${lo2}"/>
      <path d="M68 74c6-12 16-18 28-20" stroke="${shine}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="72" cy="92" r="2.4" fill="${lo2}"/><circle cx="128" cy="92" r="2.4" fill="${lo2}"/>`; break;
    case 'cap': body = `
      <path d="M100 118c40 0 78 6 88 16-4 8-34 10-62 6-12-2-20-8-26-22z" fill="${lo}"/>
      <path d="M100 118c40 0 78 6 88 16-12-2-50-6-88-4z" fill="${H}"/>
      <path d="M36 124c-2-48 28-78 64-78s62 26 62 74c-36 8-92 10-126 4z" fill="${V}"/>
      <path d="M100 46c-6 20-8 52-6 76M100 46c12 22 18 50 18 74" stroke="${lo2}" stroke-width="2" fill="none" opacity=".6"/>
      <circle cx="100" cy="46" r="6" fill="${lo}"/>
      <path d="M54 80c8-16 22-24 36-26" stroke="${shine}" stroke-width="5" fill="none" stroke-linecap="round"/>`; break;
    case 'beanie': case 'slouchy': case 'pompom': case 'beret': body = `
      <path d="M44 120c-4-52 24-86 56-86s60 34 56 86z" fill="${V}"/>
      ${[56, 70, 84, 100, 116, 130, 144].map(x => `<path d="M${x} 118c-2-24 0-50 ${x < 100 ? 6 : -6}-70" stroke="${lo}" stroke-width="3" fill="none" opacity=".55"/>`).join('')}
      <rect x="38" y="112" width="124" height="36" rx="10" fill="${H}"/>
      ${Array.from({ length: 15 }, (_, i) => `<rect x="${44 + i * 8}" y="116" width="3.5" height="28" rx="1.5" fill="${lo}" opacity=".5"/>`).join('')}
      <path d="M62 66c8-14 20-22 34-24" stroke="${shine}" stroke-width="5" fill="none" stroke-linecap="round"/>`; break;
    case 'fedora': body = `
      <ellipse cx="100" cy="128" rx="88" ry="22" fill="${lo}"/>
      <ellipse cx="100" cy="124" rx="86" ry="18" fill="${H}"/>
      <path d="M52 122c-2-40 14-70 48-70s50 30 48 70c-28 8-68 8-96 0z" fill="${V}"/>
      <path d="M84 58c6 10 26 10 32 0" stroke="${lo2}" stroke-width="3" fill="none"/>
      <path d="M53 104c30 8 64 8 94 0v14c-30 8-64 8-94 0z" fill="${lo2}"/>
      <path d="M64 78c6-12 14-18 24-20" stroke="${shine}" stroke-width="4" fill="none" stroke-linecap="round"/>`; break;

    case 'round': body = glasses(c, L, V, shine, 'round'); break;
    case 'aviator': body = glasses(c, L, V, shine, 'aviator'); break;
    case 'wayfarer': body = glasses(c, L, V, shine, 'wayfarer'); break;
    case 'cateye': body = glasses(c, L, V, shine, 'cateye'); break;

    case 'bomber': case 'denim': case 'puffer': body = jacket(product.model, c, V, H, lo, lo2, hi, shine); break;
    case 'knit': case 'leather': case 'sport': body = glove(product.model, c, V, lo, lo2, hi, shine); break;
    case 'runner': case 'hightop': case 'loafer': case 'slide': body = shoe(product.model, c, V, H, lo, lo2, hi, shine); break;
    case 'crew': case 'stripe': case 'ankle': body = sock(product.model, c, V, lo, lo2, hi, shine); break;
    default: body = `<circle cx="100" cy="100" r="60" fill="${R}"/>`;
  }
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escAttr(product.name)}">${defs}${body}</svg>`;
}
function escAttr(s) { return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

function glasses(c, L, V, shine, kind) {
  const f = c, fl = shade(c, -0.4);
  let lensL, lensR;
  if (kind === 'round') { lensL = 'M58 74a28 28 0 1 1-0.1 0z'; lensR = 'M142 74a28 28 0 1 1-0.1 0z'; }
  if (kind === 'aviator') { lensL = 'M28 80c8-8 52-10 62 0 4 22-6 44-28 44S24 104 28 80z'; lensR = 'M172 80c-8-8-52-10-62 0-4 22 6 44 28 44s34-20 34-44z'; }
  if (kind === 'wayfarer') { lensL = 'M24 76c20-6 52-6 68-2 0 26-8 42-34 42S24 104 24 76z'; lensR = 'M176 76c-20-6-52-6-68-2 0 26 8 42 34 42s34-12 34-40z'; }
  if (kind === 'cateye') { lensL = 'M20 70c22 0 54 2 70 8 0 24-10 38-34 38S22 100 20 70z'; lensR = 'M180 70c-22 0-54 2-70 8 0 24 10 38 34 38s34-16 36-46z'; }
  const thick = (kind === 'wayfarer' || kind === 'cateye') ? 9 : 4.5;
  const bridge = kind === 'aviator'
    ? `<path d="M90 82c6-4 14-4 20 0" stroke="${f}" stroke-width="3.5" fill="none"/><path d="M72 72c18-6 38-6 56 0" stroke="${f}" stroke-width="3" fill="none"/>`
    : `<path d="M${kind === 'round' ? 86 : 92} 88c6-6 10-6 ${kind === 'round' ? 28 : 16} 0" stroke="${f}" stroke-width="${thick * 0.7}" fill="none"/>`;
  return `
    <path d="M18 84l-12-6M182 84l12-6" stroke="${fl}" stroke-width="5" stroke-linecap="round"/>
    <path d="${lensL}" fill="${L}" stroke="${f}" stroke-width="${thick}"/>
    <path d="${lensR}" fill="${L}" stroke="${f}" stroke-width="${thick}"/>
    ${bridge}
    <path d="M40 86c4-6 10-9 16-10M124 86c4-6 10-9 16-10" stroke="${shine}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}

function jacket(kind, c, V, H, lo, lo2, hi, shine) {
  const torso = 'M64 40l36 14 36-14 30 14 14 92-24 6-4-60v100H48V92l-4 60-24-6 14-92z';
  let extra = '';
  if (kind === 'bomber') extra = `
    <rect x="48" y="176" width="104" height="12" rx="4" fill="${lo2}"/>${Array.from({ length: 13 }, (_, i) => `<rect x="${52 + i * 8}" y="177" width="3" height="10" fill="${lo}"/>`).join('')}
    <path d="M64 40l36 14 36-14-6 10-30 12-30-12z" fill="${lo2}"/>
    <path d="M100 56v132" stroke="${hi}" stroke-width="2.5"/>
    <rect x="16" y="140" width="28" height="9" rx="3" fill="${lo2}" transform="rotate(8 30 144)"/><rect x="156" y="140" width="28" height="9" rx="3" fill="${lo2}" transform="rotate(-8 170 144)"/>
    <path d="M140 66l10 4" stroke="${hi}" stroke-width="3"/>`;
  if (kind === 'denim') extra = `
    <path d="M64 40l36 14 36-14 4 16-40 12-40-12z" fill="${lo}"/>
    <path d="M100 58v130" stroke="${shade(c, -0.6)}" stroke-width="2.5"/>
    ${[78, 104, 130, 156].map(y => `<circle cx="106" cy="${y}" r="3" fill="#C9A45C"/>`).join('')}
    <rect x="62" y="82" width="26" height="20" rx="3" fill="none" stroke="#D9A86A" stroke-dasharray="3 3" stroke-width="1.5"/>
    <rect x="112" y="82" width="26" height="20" rx="3" fill="none" stroke="#D9A86A" stroke-dasharray="3 3" stroke-width="1.5"/>
    <path d="M48 140h104" stroke="#D9A86A" stroke-dasharray="3 3" stroke-width="1.5"/>`;
  if (kind === 'puffer') extra = `
    ${[70, 96, 122, 148, 174].map(y => `<path d="M48 ${y}c18 6 86 6 104 0" stroke="${lo}" stroke-width="3" fill="none"/>`).join('')}
    ${[80, 108, 136].map(y => `<path d="M26 ${y}l20 2M174 ${y}l-20 2" stroke="${lo}" stroke-width="3"/>`).join('')}
    <path d="M70 38c10 12 50 12 60 0l6 4c-6 18-66 18-72 0z" fill="${lo}"/>
    <path d="M100 52v136" stroke="${shade(c, -0.6)}" stroke-width="2.5"/>`;
  return `<path d="${torso}" fill="${V}"/>${extra}
    <path d="M58 70c4-10 10-16 18-20" stroke="${shine}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}

function glove(kind, c, V, lo, lo2, hi, shine) {
  const hand = 'M62 186V112L44 84c-6-9 6-18 14-10l14 16V40c0-12 16-12 16 0v42-50c0-12 16-12 16 0v50-42c0-12 16-12 16 0v46-30c0-12 16-12 16 0v62c0 30-14 48-24 56v12z';
  let extra = '';
  if (kind === 'knit') extra = `<rect x="58" y="158" width="74" height="30" rx="6" fill="${lo}"/>
    <path d="M58 168h74M58 178h74" stroke="${shade(c, 0.6)}" stroke-width="4"/>
    ${[78, 94, 110, 126].map((x, i) => `<rect x="${x - 6}" y="${[34, 26, 34, 50][i]}" width="12" height="10" rx="5" fill="${lo2}"/>`).join('')}`;
  if (kind === 'leather') extra = `<path d="M62 160h68" stroke="${lo2}" stroke-width="3"/><circle cx="120" cy="172" r="4" fill="${hi}"/>
    <path d="M88 82v40M104 82v40M120 88v34" stroke="${lo2}" stroke-width="2" opacity=".6"/>`;
  if (kind === 'sport') extra = `<rect x="58" y="150" width="78" height="22" rx="8" fill="${lo2}"/><rect x="66" y="154" width="40" height="14" rx="5" fill="${hi}" opacity=".6"/>
    <path d="M72 120h58M72 132h58" stroke="${lo2}" stroke-width="2" opacity=".5"/>
    ${[80, 96, 112, 128].map((x, i) => `<path d="M${x} ${[60, 52, 60, 74][i]}v-${[18, 18, 18, 14][i]}" stroke="${lo2}" stroke-width="12" stroke-linecap="round" opacity=".5"/>`).join('')}`;
  return `<path d="${hand}" fill="${V}" stroke="${lo2}" stroke-width="2"/>${extra}
    <path d="M78 46v30M94 38v30" stroke="${shine}" stroke-width="4" stroke-linecap="round"/>`;
}

function shoe(kind, c, V, H, lo, lo2, hi, shine) {
  const light = isLight(c);
  const sole = light ? '#C9CBD6' : '#ECEDF3';
  if (kind === 'slide') return `
    <path d="M14 150h172c4 0 6 6 2 10-4 4-10 6-16 6H28c-8 0-14-6-14-16z" fill="${lo2}"/>
    <path d="M18 146h166v6H18z" fill="${lo}"/>
    <path d="M70 146c2-30 14-48 40-50 26 2 40 20 44 50z" fill="${V}"/>
    <path d="M86 122h50" stroke="#F2F2F0" stroke-width="8" stroke-linecap="round"/>`;
  if (kind === 'loafer') return `
    <path d="M18 132c0-14 8-26 22-28 20-2 30 6 54 8 30 2 60 2 78 14 10 6 12 16 8 22H22c-4-4-4-10-4-16z" fill="${V}"/>
    <path d="M18 148h162v10c0 4-4 6-8 6H24c-4 0-6-2-6-6z" fill="${lo2}"/>
    <path d="M96 112c12 0 40 2 56 10-10 10-40 12-58 6z" fill="${lo}"/>
    <rect x="104" y="114" width="30" height="8" rx="3" fill="${lo2}"/>
    <path d="M40 112c12-4 24-2 34 2" stroke="${shine}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  if (kind === 'hightop') return `
    <path d="M36 50h52c4 30 10 50 28 62 24 6 52 6 62 22 4 6 2 12-2 14H28c-4-30 0-64 8-98z" fill="${V}"/>
    <path d="M24 148h162v12c0 4-4 6-8 6H30c-4 0-6-2-6-6z" fill="${sole}"/>
    <path d="M24 148h162" stroke="${lo2}" stroke-width="2"/>
    <path d="M36 50h52" stroke="${lo2}" stroke-width="8" stroke-linecap="round"/>
    ${[66, 78, 90, 102].map((y, i) => `<path d="M${70 + i * 6} ${y}l18 ${-6}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`).join('')}
    <circle cx="50" cy="96" r="12" fill="none" stroke="${hi}" stroke-width="3"/>
    <path d="M44 62c-2 14-2 30 0 44" stroke="${shine}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  return `
    <path d="M30 86c14-4 30-2 42 10l14 12c24 8 58 10 80 18 12 4 18 12 16 22H26c-6-20-4-46 4-62z" fill="${V}"/>
    <path d="M22 140h164c2 8-2 18-12 20H34c-8 0-12-8-12-20z" fill="${sole}"/>
    <path d="M30 150c40 4 110 4 150 0" stroke="${lo}" stroke-width="2" fill="none" opacity=".6"/>
    <path d="M40 120c30-8 60-2 96 12" stroke="${hi}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".8"/>
    ${[0, 1, 2, 3].map(i => `<path d="M${74 + i * 8} ${100 + i * 3}l10 -10" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`).join('')}
    <path d="M36 94c8-2 16 0 22 4" stroke="${shine}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}

function sock(kind, c, V, lo, lo2, hi, shine) {
  const top = kind === 'ankle' ? 92 : 22;
  const path = `M70 ${top}h52v${118 - top}l40 26c14 10 6 34-12 32-8 0-14-4-20-8l-54-30c-6-4-6-8-6-14z`;
  let extra = `<rect x="70" y="${top}" width="52" height="${kind === 'ankle' ? 10 : 22}" rx="3" fill="${lo}"/>
    <path d="M140 148c8 4 18 8 22 16" stroke="${lo2}" stroke-width="10" fill="none" stroke-linecap="round" opacity=".7"/>
    <path d="M70 128c4 8 14 12 26 14" stroke="${lo2}" stroke-width="10" fill="none" stroke-linecap="round" opacity=".6"/>`;
  if (kind === 'stripe') extra += [52, 66, 80, 94].map(y => `<rect x="70" y="${y}" width="52" height="7" fill="${shade(c, 0.65)}"/>`).join('');
  if (kind === 'ankle') extra += `<path d="M70 92c-6 0-10 6-8 12" stroke="${lo2}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  return `<path d="${path}" fill="${V}"/>${extra}
    <path d="M80 ${top + 30}v40" stroke="${shine}" stroke-width="4" stroke-linecap="round"/>`;
}
