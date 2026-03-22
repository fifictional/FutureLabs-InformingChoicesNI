import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from '@mui/material';
import { useState } from 'react';

export default function ViewDescriptionDialog({ ...props }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpen = () => setDialogOpen(true);
  const handleClose = () => setDialogOpen(false);
  return (
    <>
      <Button color="accent" onClick={() => handleOpen()}>
        View
      </Button>
      <Dialog fullWidth maxWidth="sm" open={dialogOpen} onClose={handleClose}>
        <DialogTitle>{props.name}</DialogTitle>
        <DialogContent>
          <Typography>{props.description || 'No Description'}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleClose()}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
