// Demo reviews (D-200). Every review comes from a demo customer with a delivered demo order for
// that product, so each one stays tied to an order item like a real verified review (D-150).
// Text is about everyday use and never states a spec the product data doesn't back (D-22).
// A real launch starts with none (production blocker).

export const reviewers = [
  'Aarav Mehta',
  'Ananya Iyer',
  'Rohan Gupta',
  'Priya Nair',
  'Vikram Singh',
  'Sneha Kulkarni',
  'Arjun Reddy',
  'Kavya Menon',
  'Siddharth Rao',
  'Meera Joshi',
  'Karan Malhotra',
  'Divya Pillai',
  'Aditya Verma',
  'Ishita Banerjee',
  'Rahul Desai',
  'Neha Chawla',
  'Farhan Qureshi',
  'Pooja Hegde',
  'Manish Agarwal',
  'Lakshmi Krishnan',
  'Harpreet Kaur',
  'Tanvi Shah',
  'Nikhil Bhat',
  'Zoya Khan',
];

export type ReviewTemplate = { rating: 1 | 2 | 3 | 4 | 5; title: string; body: string };

/** `{name}` becomes the product name. Ratings are a real spread, not all fives. */
export const reviewTemplates: Record<string, ReviewTemplate[]> = {
  smartphones: [
    {
      rating: 5,
      title: 'Smooth everyday phone',
      body: 'Moved to the {name} from an older phone and everything feels quicker. Apps open fast and the screen is lovely to read in daylight.',
    },
    {
      rating: 4,
      title: 'Battery gets me through the day',
      body: 'With calls, maps and a bit of video I usually end the day with charge left. Camera is good in daylight, a little soft indoors.',
    },
    {
      rating: 5,
      title: 'Great value',
      body: 'For the price this feels like a much more expensive phone. Setup took ten minutes and moving my contacts was easy.',
    },
    {
      rating: 3,
      title: 'Good, but a bit big for me',
      body: 'Performance is fine and the display is bright, but it is large for one-handed use. Fine if you like big screens.',
    },
    {
      rating: 4,
      title: 'Solid build',
      body: 'Feels well made and the buttons are firm. Speakers are clear enough for calls on speaker. Would have liked more colour options.',
    },
    {
      rating: 2,
      title: 'Camera at night disappointed me',
      body: 'Daytime photos are nice but low-light shots look noisy to me. Everything else about the {name} is decent.',
    },
    {
      rating: 5,
      title: 'Delivered quickly, no issues',
      body: 'Arrived two days after ordering, well packed. A month in and the {name} has been completely reliable.',
    },
    {
      rating: 4,
      title: 'Clean software',
      body: 'Very little bloatware and updates have arrived on time so far. Fingerprint unlock is quick.',
    },
  ],
  audio: [
    {
      rating: 5,
      title: 'Lovely sound for the price',
      body: 'The {name} sounds full without being muddy. Pairing with my phone was instant.',
    },
    {
      rating: 4,
      title: 'Comfortable for long use',
      body: 'I wear them through my commute and calls. Comfortable for a couple of hours at a stretch.',
    },
    {
      rating: 4,
      title: 'Good for calls',
      body: 'People say I sound clear even on a busy road. Battery life has matched what I expected.',
    },
    {
      rating: 3,
      title: 'Fit takes some getting used to',
      body: 'Sound is good but it took me a few days to find a fit that felt secure. Try the different sizes if they come with it.',
    },
    {
      rating: 5,
      title: 'Daily driver now',
      body: 'Use the {name} every day for music and meetings. Case is small enough for a pocket.',
    },
    {
      rating: 2,
      title: 'Connection drops occasionally',
      body: 'Every so often the audio cuts out for a second when my phone is in my back pocket. Otherwise fine.',
    },
    {
      rating: 4,
      title: 'Nice upgrade',
      body: 'Clear step up from my old pair. Bass is punchy without overpowering vocals.',
    },
  ],
  wearables: [
    {
      rating: 5,
      title: 'Light and comfortable',
      body: 'Forget I am wearing the {name} most of the day. Notifications come through reliably.',
    },
    {
      rating: 4,
      title: 'Good activity tracking',
      body: 'Step counts line up with my phone and workouts are easy to start. App is simple.',
    },
    {
      rating: 3,
      title: 'Strap could be better',
      body: 'Tracker itself works well but the strap marked my wrist on hot days. Swapped it and now it is fine.',
    },
    {
      rating: 4,
      title: 'Battery lasts well',
      body: 'I charge it a couple of times a week. Screen is readable outdoors.',
    },
    {
      rating: 5,
      title: 'Motivating',
      body: 'The reminders to move have actually changed my habits. Happy with the {name}.',
    },
    {
      rating: 2,
      title: 'Sleep tracking hit and miss',
      body: 'Some nights it records sleep well, other nights it misses chunks. Daytime features are good.',
    },
  ],
  accessories: [
    {
      rating: 5,
      title: 'Does exactly what it should',
      body: 'The {name} works as described and feels well made. No complaints.',
    },
    {
      rating: 4,
      title: 'Good quality',
      body: 'Better finish than the cheap ones I used before. Arrived well packed.',
    },
    { rating: 4, title: 'Fits perfectly', body: 'Fits my Borneo device exactly. Would buy again.' },
    {
      rating: 3,
      title: 'Fine, nothing special',
      body: 'Works as it should. Price is fair for what it is.',
    },
    {
      rating: 5,
      title: 'Bought a second one',
      body: 'Liked the first so much I bought another for the office.',
    },
  ],
  'smart-home': [
    {
      rating: 5,
      title: 'Easy setup',
      body: 'The {name} was set up in the app in a few minutes. Has worked reliably since.',
    },
    {
      rating: 4,
      title: 'Works well day to day',
      body: 'Responds quickly and the app is straightforward. Took one try to join my Wi-Fi.',
    },
    {
      rating: 3,
      title: 'App could be clearer',
      body: 'Device works fine, but some app settings took me a while to find.',
    },
    {
      rating: 4,
      title: 'Good value',
      body: 'Does what I needed for much less than other brands I looked at.',
    },
    {
      rating: 5,
      title: 'Family uses it daily',
      body: 'Everyone at home got the hang of it quickly. No disconnections so far.',
    },
    {
      rating: 2,
      title: 'Lost connection a few times',
      body: 'Went offline twice in the first week and needed a restart. Fine since then.',
    },
  ],
  tvs: [
    {
      rating: 5,
      title: 'Great picture',
      body: 'Colours look rich and the {name} handles cricket and movies well. Setup was simple.',
    },
    {
      rating: 4,
      title: 'Good smart features',
      body: 'Apps load quickly and the remote is easy to use. Sound is fine but I added a soundbar.',
    },
    {
      rating: 4,
      title: 'Delivery and setup went smoothly',
      body: 'Arrived on the estimated date, well packed. Wall-mounted it the same day.',
    },
    {
      rating: 3,
      title: 'Viewing angle could be better',
      body: 'Picture is great straight on, a little washed out from the side of the room.',
    },
    {
      rating: 5,
      title: 'Worth it',
      body: 'Big upgrade from our old TV. Very happy with the {name}.',
    },
  ],
  'robot-vacuums': [
    {
      rating: 5,
      title: 'Saves so much time',
      body: 'The {name} runs every morning and the floors stay clean. Mapping worked on the first run.',
    },
    {
      rating: 4,
      title: 'Handles pet hair well',
      body: 'We have a dog and it keeps up. Brush needs untangling every week or so.',
    },
    {
      rating: 3,
      title: 'Gets stuck under the sofa sometimes',
      body: 'Cleans well but occasionally needs rescuing from under furniture. No-go zones helped.',
    },
    {
      rating: 4,
      title: 'Quiet enough',
      body: 'Can run it while working from home without being distracted. App scheduling is easy.',
    },
    {
      rating: 5,
      title: 'Best purchase this year',
      body: 'Floors are cleaner than when we swept by hand.',
    },
  ],
};

/** Reviews per product: 3–7, varying by product so counts look natural. */
export const REVIEWS_MIN = 3;
export const REVIEWS_SPREAD = 5;
