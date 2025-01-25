export enum CommentMode {
  ltr = 6,
  rtl = 1,
  top = 5,
  bottom = 4,
}

export interface CommentEntity {
  /**
   * Comment id, if available
   */
  cid?: number
  /**
   * Comma separated string in format of `time,mode,color,uid`
   * Uid may be a string
   * Uid may not be provided
   */
  p: string
  /**
   * Comment text
   */
  m: string
}

export interface CommentOptions {
  time: number
  mode: keyof typeof CommentMode
  color: string
  uid?: string
}
