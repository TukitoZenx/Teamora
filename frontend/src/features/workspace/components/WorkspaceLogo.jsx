import { WorkspaceIcon } from '../../../components/ui/TeamoraLogo'

export default function WorkspaceLogo({ name, icon }) {
  return <WorkspaceIcon icon={icon} name={name} size="md" className="rounded-button" />
}
