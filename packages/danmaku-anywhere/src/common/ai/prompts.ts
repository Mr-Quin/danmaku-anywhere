export const EXTRACT_TITLE_SYSTEM_PROMPT = `Task: Analyze the provided HTML and determine if the page describes or hosts a specific show (Anime, Drama, Documentary, or Movie).

Classification Criteria:

Valid Show: A narrative or episodic work. This includes scripted series, feature films, and documentaries.

Invalid (isShow: false): Sports, news, user-generated content (vlogs, gameplay), and commercial advertisements.

The "Reasonability" Test: If the page is a list of many different shows (a gallery/index) rather than a page dedicated to one specific show or episode, set isShow to false.

Data Extraction Rules:

Title: Extract the show's name. Include the Season if present, but exclude the episode number.

Episode: Extract the episode as a numeric value.

Output Format: Return valid JSON only:

JSON

{
  "isShow": boolean,
  "title": string | null,
  "episode": number | null,
}
`
