import { useEffect, useState } from 'react'
import { createLocalCollabChannel } from '../components/utils/localCollabChannel'

const keyFor = (workspaceId, feature) => `${workspaceId}::${feature}`

/**
 * Creates (and tears down) a `localCollabChannel` scoped to one
 * `workspaceId` + `feature` pair, recreating it if either changes (e.g. the
 * user switches workspaces without unmounting this section). See
 * `src/utils/localCollabChannel.js` for what this channel actually does.
 *
 * Uses React's documented "adjusting state during render" pattern (storing
 * the previous key alongside the channel) rather than an effect, so the
 * replacement channel is ready on the very same render instead of one render
 * late - see https://react.dev/reference/react/useState#storing-information-from-previous-renders
 */
export default function useLocalCollabChannel(workspaceId, feature) {
  const key = keyFor(workspaceId, feature)
  const [channel, setChannel] = useState(() => createLocalCollabChannel(workspaceId, feature))
  const [channelKey, setChannelKey] = useState(key)

  let currentChannel = channel
  if (key !== channelKey) {
    channel.destroy()
    currentChannel = createLocalCollabChannel(workspaceId, feature)
    setChannel(currentChannel)
    setChannelKey(key)
  }

  useEffect(() => () => currentChannel.destroy(), [currentChannel])

  return currentChannel
}
