import { Add, Delete, Edit } from '@mui/icons-material'
import {
  Box,
  Button,
  Container,
  Dialog,
  IconButton,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material'
import { useState } from 'react'
import { useMountConfig } from '@/common/hooks/mountConfig/useMountConfig'
import { MountConfig } from '@/common/constants'

interface MountConfigTableProps {
  data: MountConfig[]
  onDelete: (id: number) => void
  onEdit: (id: number) => void
  onAdd: () => void
  onEnable: (id: number, enabled: boolean) => void
}

export const MountConfigTable = ({
  data,
  onEdit,
  onEnable,
  onAdd,
  onDelete,
}: MountConfigTableProps) => {
  return (
    <Box>
      <IconButton
        onClick={() => {
          onAdd()
        }}
      >
        <Add />
      </IconButton>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Patterns</TableCell>
            <TableCell>Enabled</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((config) => (
            <TableRow key={config.id}>
              <TableCell>{config.id}</TableCell>
              <TableCell>{config.patterns.join(', ')}</TableCell>
              <TableCell>
                <Switch
                  checked={config.enabled}
                  onChange={(e) => {
                    onEnable(config.id, e.target.checked)
                  }}
                />
              </TableCell>
              <TableCell>
                <IconButton
                  onClick={() => {
                    onEdit(config.id)
                  }}
                >
                  <Edit />
                </IconButton>
                <IconButton
                  onClick={() => {
                    onDelete(config.id)
                  }}
                  disabled={config.predefined}
                >
                  <Delete />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

interface MountConfigEditorProps {
  config: MountConfig | null
  open: boolean
  onClose: () => void
  onSave: (config: MountConfig) => void
}

export const MountConfigEditor = ({
  config,
  open,
  onClose,
  onSave,
  mode,
}: MountConfigEditorProps) => {
  return (
    <Dialog open={open} onClose={onClose}>
      {config ? <h2>Edit Config</h2> : <h2>Add New Config</h2>}
      <div>
        <TextField
          label="Media Query"
          value={config?.mediaQuery || ''}
          onChange={(e) => {}}
        />
        <TextField
          label="Container Query"
          value={config?.containerQuery || ''}
          onChange={(e) => {}}
        />
        <Button
          onClick={() => {
            onClose()
          }}
        >
          Save
        </Button>
      </div>
    </Dialog>
  )
}
export const MountConfigManager = () => {
  const { configs, updateConfig, deleteConfig, addConfig } = useMountConfig()
  const [selectedConfig, setSelectedConfig] = useState<MountConfig | null>(null)
  const [openModal, setOpenModal] = useState(false)

  if (!configs) return null
  const handleEdit = (id: number) => {
    setSelectedConfig(configs.find((config) => config.id === id) ?? null)
    // setOpenModal(true)
  }

  const handleAdd = () => {
    setSelectedConfig(null)
    // setOpenModal(true)
  }

  const handleDelete = (id: number) => {
    deleteConfig(id)
  }

  const handleEnable = (id: number, enabled: boolean) => {
    updateConfig(id, { enabled })
  }

  const handleSave = (config: MountConfig) => {
    if (config.id) {
      updateConfig(config.id, config)
    } else {
      addConfig(config)
    }
  }

  return (
    <>
      <MountConfigTable
        data={configs}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onAdd={handleAdd}
        onEnable={handleEnable}
      />
      <MountConfigEditor
        config={selectedConfig}
        open={openModal}
        onClose={() => {
          setOpenModal(false)
        }}
        onSave={handleSave}
      />
    </>
  )
}

export const Options = () => {
  return (
    <Container fixed>
      <Paper>
        <MountConfigManager />
      </Paper>
    </Container>
  )
}
