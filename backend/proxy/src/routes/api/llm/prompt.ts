import { type GenerationConfig, SchemaType } from '@google/generative-ai'

export const v1Prompt =
  'Given the HTML below, infer the currently playing show, and return the following information about the show:\ntitle: The title of the show, do not include season or episode number\nseason: The season of the show, if available. The season may not be numeric.\nepisode: The episode number. Return 1 if not available.\naltTitles: Any known alternative titles of the show, for example in other languages\nepisodeTitle: The title of the single episode, if available\n\nIf no show is detected, return an empty title'

export const v1GenerationConfig: GenerationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 1024,
  responseMimeType: 'application/json',
  responseSchema: {
    type: SchemaType.OBJECT,
    properties: {
      title: {
        type: SchemaType.STRING,
      },
      episode: {
        type: SchemaType.NUMBER,
      },
      season: {
        type: SchemaType.STRING,
      },
      altTitles: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
        },
      },
      episodeTitle: {
        type: SchemaType.STRING,
      },
    },
    required: ['title', 'episode'],
  },
}

export const v2Prompt = `Given the HTML below from a website, determine if there is a show playing in the page. If there is not, set isShow to false and leave all fields empty. 
A show can be episodic, such as anime, drama, documentaries, or non-episodic, such as a movie. Things that do not qualify as shows include sports, user generated videos (e.g. youtube), and news. Pay attention to clues that may disqualify the show.
If there is a show, infer the currently playing show, and return the following information about the show:
title: The title of the show. Include its season information if there is any. Do not include the episode number, the episode number should be returned in the "episode" property. For example, if the HTML includes "Bluey S01 E01", the title should be "Bluey S01".
episode: The numeric episode number, be sure to include it if one is available.
altTitles: A list of other possible titles found in the HTML.
episodeTitle: The title of the singular episode, if available.`

export const v2GenerationConfig: GenerationConfig = {
  temperature: 0.75,
  responseMimeType: 'application/json',
  responseSchema: {
    type: SchemaType.OBJECT,
    required: ['isShow', 'title', 'episode', 'altTitles', 'episodeTitle'],
    properties: {
      isShow: {
        type: SchemaType.BOOLEAN,
      },
      title: {
        type: SchemaType.STRING,
      },
      episode: {
        type: SchemaType.NUMBER,
      },
      altTitles: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
        },
      },
      episodeTitle: {
        type: SchemaType.STRING,
      },
    },
  },
}
