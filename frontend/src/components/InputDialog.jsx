import { Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions, Button } from '@mui/material';

function InputDialog({ open, onClose, onSubmit, value, onChange }) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Input Box</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Please enter a value below.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="name"
          label="Value"
          type="text"
          fullWidth
          variant="standard"
          value={value}
          onChange={onChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit}>Submit</Button>
      </DialogActions>
    </Dialog>
  );
}

export default InputDialog;