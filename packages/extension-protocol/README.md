# @danmaku-anywhere/extension-protocol

The messages the Danmaku Anywhere extension exchanges with the pages it talks to, such as the web app: action and message types, request and response helpers, the attributes the extension sets on the page so the page can detect it, and the Kazumi policy schema those messages carry.

It has no Chrome dependency. The helpers that read and write the page attributes need a DOM.

Whatever goes over the wire (action names, message fields, source strings, attribute names) has to stay compatible with extension versions that are already installed.
