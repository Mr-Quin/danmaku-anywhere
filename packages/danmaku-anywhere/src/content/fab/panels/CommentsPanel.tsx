import { useStore } from '../../store/store'
import { CommentList } from '../components/CommentList'

export const CommentsPanel = () => {
  const { comments } = useStore()

  return (
    <>
      {comments.length > 0 ? (
        <CommentList comments={comments} />
      ) : (
        'no comments'
      )}
    </>
  )
}
