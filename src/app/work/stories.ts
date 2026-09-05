/** The story behind each project, in the studio voice. Short sentences. No prices, no client staff names. */
export type Story = { sections: { h: string; ps: string[] }[] };

export const STORIES: Record<string, Story> = {
  ucl: {
    sections: [
      { h: "Where they were", ps: [
        "UCL run crews and vans across live sites every day. The admin behind that lived in spreadsheets, group chats and paper. Vehicle checks were photos on a phone. Timesheets were a Friday afternoon job for someone in the office. Nobody could say where a van was without ringing the driver.",
        "They had tried an off the shelf app. It did one thing and charged for five. They wanted something built around how they actually work.",
      ]},
      { h: "What we built", ps: [
        "An iOS app for the crew and a back office for the people running the business, both talking to one system.",
        "Sign in that is actually secure. A crew calendar so everyone knows where they are on Monday. Vehicle inspections with photo evidence, submitted from the cab and stored properly. A live fleet map with every van, moving, parked or gone quiet, plus the journey history for each one. Timesheets and earnings that build themselves from the day, so the driver sees what they have made and the office sees the same number. A newsfeed for site updates and photos. And a back office with the whole picture: staff, vehicles, journeys, schedules, all exportable in one click when the accountant asks.",
        "Rosters upload from the spreadsheet they already keep, so nobody had to change how they plan the week.",
      ]},
      { h: "The hard bits", ps: [
        "Tracking a van for a ten hour shift without flattening the phone is a real engineering problem. We built adaptive tracking that backs off when the vehicle is parked and wakes up when it moves, and it keeps going if the app is force quit.",
        "Every screen was tested by people who use their phones with gloves on. When something broke in the field we fixed it the same day, usually before the crew clocked off.",
      ]},
      { h: "What it saved them", ps: [
        "One system instead of a stack of subscriptions, which alone paid for the build. The Friday timesheet job disappeared. Vehicle checks stopped being lost. The office got hours back every week that used to go on chasing, checking and retyping. And the business finally has its own data, in one place, that it can grow on.",
      ]},
    ],
  },
  "cm-taylor": {
    sections: [
      { h: "Where he was", ps: [
        "Craig is a novelist, a screenwriter and a filmmaker, and his site said none of that. He had built it himself on a template. It listed the books, tacked the essays on at the bottom and had nowhere to put the films at all.",
        "He knew exactly what he wanted it to feel like. An art book. Quiet architecture, with his own work providing the colour. He just could not get it out of his head and onto the screen.",
      ]},
      { h: "What we built", ps: [
        "A site that opens on his own footage. Each visit plays a different film in the hero, silent until you ask for sound. Sections turn like the page of a book.",
        "Every novel has its own page, with a jacket cut from one of his paintings. Every film has a page with the trailer, the festival laurels and the story behind it. The essays pull straight from his newsletter and update themselves every week without him touching anything.",
        "Then the part he did not expect: a plain English editor, built just for him. He logs in, changes a page, hits publish, and it goes live. No developer, no ticket, no waiting. There is a manual inside it, written in his language, not ours.",
      ]},
      { h: "How it went", ps: [
        "He sent one round of notes. We shipped them the same day. He sent a second, and we shipped those the same day too. It went live a few weeks after the brief and he has been running it himself ever since.",
      ]},
    ],
  },
  "spencer-lynch": {
    sections: [
      { h: "Where he was", ps: [
        "Spencer is one of the most booked magicians in the north west. Premier League clubs, global brands, television. His website was fifteen years old and looked it. Prospects who had just seen him perform were landing on something that undersold him badly.",
        "He wanted something he would be proud to send.",
      ]},
      { h: "What we built", ps: [
        "The look is a card maker's library: black, cream and foiled gold. Restrained, expensive, no gimmicks, because the man is the gimmick.",
        "It opens on a cinematic showreel. Then the credentials, laid out as playing cards that tilt and catch the light as you move across them. The stadium years, the boardroom work, the charities, the broadcasters. An about page with a guarantee that only someone this confident would put in writing. A booking page that gets to the point.",
        "There are things hidden in it too, for the curious. A site for a magician ought to have a trick or two up its sleeve.",
      ]},
      { h: "The detail", ps: [
        "The site had to work on any phone a prospect might pull out at a wedding, including old ones. So it does. It is fast, it is found by Google for the searches that matter, and enquiries go straight to his phone.",
      ]},
    ],
  },
  pensionable: {
    sections: [
      { h: "Where they were", ps: [
        "PensionAble is a startup taking on one of the slowest corners of finance. Pension scheme calculations that take consultancies months, they can do in days, audited and explained. New company, serious product, no website.",
        "They needed a site that would put them in front of actuaries and scheme administrators and be taken seriously in the first five seconds.",
      ]},
      { h: "What we built", ps: [
        "Four pages that say exactly what it does and who it is for. No hype, because the audience does not buy hype. A dark hero with a slow, living shader behind the headline, so it feels like technology without shouting about it. A how it works page that walks through the process step by step. A demo page and a contact page that get straight to a conversation.",
        "The palette is navy and teal, the type is clean, and every sentence was cut until it earned its place.",
      ]},
      { h: "How it went", ps: [
        "Brief to live site in a weekend. It has been the front door for their conversations with the industry since.",
      ]},
    ],
  },
  "we-speak-to-robots": {
    sections: [
      { h: "Where they were", ps: [
        "We Speak to Robots is an AI consultancy for businesses that know they should be using this stuff and have no idea where to start. They audit, they build, they hand over. They needed a site that made a confusing subject feel simple.",
      ]},
      { h: "What we built", ps: [
        "Nine pages in a dark navy and mint palette, with a 3D graphic floating in the hero. The pitch is one line: we talk to AI so you don't have to. Services, solutions and a pricing model built around a free consultation, an audit and a share of the savings, so a client only pays when it works.",
        "The team page uses real people and real photos. The whole design system is written down so every future piece of the brand matches.",
      ]},
      { h: "The detail", ps: [
        "Every animation on the page had to survive on a mid range Android on 4G. They do. Booking goes straight into the calendar.",
      ]},
    ],
  },
  "jack-crump": {
    sections: [
      { h: "Why", ps: [
        "This one is ours. I take photographs on my phone, mostly landscapes and buildings, and I had an idea for a portfolio where the pictures drift across the screen like a table of prints. I wanted to see if it was possible.",
      ]},
      { h: "What we built", ps: [
        "A grid of photographs that floats and settles as you move. Nothing between you and the images: no menus, no captions until you want them, no chrome. Click a picture and it fills the screen. That is the whole site, on purpose.",
      ]},
      { h: "What it taught us", ps: [
        "Most of the motion work you see on client sites started as an experiment here. It is where we find out what a browser can do before we promise it to anyone.",
      ]},
    ],
  },
  "blue-shed": {
    sections: [
      { h: "Where they were", ps: [
        "The Blue Shed Group coaches professionals who want to lead themselves better. Clients on three continents, all found by word of mouth. They needed a place to send people that explained the work and made it easy to book a call.",
      ]},
      { h: "What we built", ps: [
        "A calm, single page site. Who it is for, how the programmes run, what past clients say, and a book a call button that goes straight to the diary. An online business card that does the introduction so the first conversation can go deeper.",
      ]},
    ],
  },
  "d-farquharson": {
    sections: [
      { h: "Where they were", ps: [
        "A groundworks and building contractor working across Perthshire and Fife. Accredited, insured, busy, and invisible online. Every job came through recommendation, and every recommendation ended with someone searching the name and finding nothing.",
      ]},
      { h: "What we built", ps: [
        "A site that does what a good site visit does. Services laid out plainly. A gallery of finished work: drainage, foundations, stonework, driveways. The accreditations where people look for them. A quote form that lands in their inbox with the details already filled in.",
        "It is built to be found. Sitemap, search titles, fast loading on a phone in a field with one bar of signal.",
      ]},
      { h: "How it went", ps: [
        "Live since spring. Updated as new work comes in. It is the first thing a prospect sees now, and it looks like the business it represents.",
      ]},
    ],
  },
  "waterloo-abc": {
    sections: [
      { h: "Where they were", ps: [
        "Waterloo ABC is a boxing club in Liverpool that has been turning kids into fighters and adults into fitter versions of themselves for years. Sessions cost a few pounds. Word got around the neighbourhood but not much further.",
      ]},
      { h: "What we built", ps: [
        "One page with everything a parent or a nervous first timer needs. The classes, from children's sessions to ladies fitness to competition training. The weekly timetable. Real photos from the gym. The coaches. Reviews pulled from the people who actually train there. The map, the address, and the answers to the questions everyone asks before they walk in.",
        "No forms, no fuss. You read it, you turn up.",
      ]},
    ],
  },
  "brickin-awesome": {
    sections: [
      { h: "Where they were", ps: [
        "Fifteen years of brickwork, repointing and chimney repairs across Wrexham and North Wales, and not a single page online to show for it.",
      ]},
      { h: "What we built", ps: [
        "A one page site that does the job of a van livery and a business card at once. What they do, where they work, why they are worth calling, and how to get in touch. Built to load instantly and read well on a phone, because that is where every enquiry starts.",
      ]},
    ],
  },
  lemovals: {
    sections: [
      { h: "Where they were", ps: [
        "Lemovals is a removals and man with a van service on the Sefton coast. Good reviews, a full diary, and a phone number on Facebook. They wanted to look like the professional operation they already were and stop losing quotes to companies with a website.",
      ]},
      { h: "What we built", ps: [
        "It opens on a film of a move that plays as you scroll, so the first thing you see is the van, the crew and the job done. Then four services, each with its own page. Clear pricing. A quote form that asks the five things they need and nothing else, and lands on their phone in seconds.",
        "A page for each area they cover, so someone in Formby searching for a removals company finds them first.",
      ]},
      { h: "The detail", ps: [
        "The scroll film was rebuilt three times until it ran smoothly on a cheap phone on mobile data. Nobody quotes a removal from a desktop.",
      ]},
    ],
  },
};
