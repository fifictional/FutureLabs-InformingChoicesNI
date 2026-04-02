import { Add, DeleteOutline, Refresh } from '@mui/icons-material';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import ContainerWithBackground from '../components/common/ContainerWithBackground';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [appointmentsDraft, setAppointmentsDraft] = useState('0');
  const [loading, setLoading] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [savingAppointments, setSavingAppointments] = useState(false);
  const [error, setError] = useState('');
  const [initials, setInitials] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [refreshKey, setRefreshKey] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [clientRows, appointments] = await Promise.all([
          window.api.clients.list(),
          window.api.clients.getTotalAppointments()
        ]);
        setClients(Array.isArray(clientRows) ? clientRows : []);
        setTotalAppointments(Number(appointments || 0));
        setAppointmentsDraft(String(Number(appointments || 0)));
      } catch (loadError) {
        setError(loadError?.message || 'Failed to load clients data.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [refreshKey]);

  const rows = useMemo(
    () =>
      clients.map((client) => ({
        id: client.id,
        initials: client.nonConfidentialIdentifier || '',
        dateOfBirth: formatDate(client.dateOfBirth),
        referenceId: client.referenceId || ''
      })),
    [clients]
  );

  const columns = [
    { field: 'initials', headerName: 'Initials', flex: 0.7, minWidth: 120 },
    { field: 'dateOfBirth', headerName: 'Date of Birth', flex: 0.9, minWidth: 140 },
    { field: 'referenceId', headerName: 'Reference ID', flex: 1.2, minWidth: 180 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          aria-label="Delete client"
          color="error"
          onClick={async () => {
            try {
              await window.api.clients.delete(params.row.id);
              setRefreshKey((previous) => !previous);
            } catch (deleteError) {
              setError(deleteError?.message || 'Failed to delete client.');
            }
          }}
        >
          <DeleteOutline fontSize="small" />
        </IconButton>
      )
    }
  ];

  async function handleCreateClient() {
    setSavingClient(true);
    setError('');
    try {
      await window.api.clients.create({
        nonConfidentialIdentifier: initials,
        dateOfBirth,
        referenceId
      });
      setInitials('');
      setDateOfBirth('');
      setReferenceId('');
      setRefreshKey((previous) => !previous);
    } catch (createError) {
      setError(createError?.message || 'Failed to create client.');
    } finally {
      setSavingClient(false);
    }
  }

  async function handleSetAppointments() {
    setSavingAppointments(true);
    setError('');
    try {
      const nextValue = await window.api.clients.setTotalAppointments(Number(appointmentsDraft || 0));
      setTotalAppointments(Number(nextValue || 0));
      setAppointmentsDraft(String(Number(nextValue || 0)));
    } catch (appointmentsError) {
      setError(appointmentsError?.message || 'Failed to save appointments total.');
    } finally {
      setSavingAppointments(false);
    }
  }

  async function handleAdjustAppointments(delta) {
    setSavingAppointments(true);
    setError('');
    try {
      const nextValue = await window.api.clients.adjustTotalAppointments(delta);
      setTotalAppointments(Number(nextValue || 0));
      setAppointmentsDraft(String(Number(nextValue || 0)));
    } catch (appointmentsError) {
      setError(appointmentsError?.message || 'Failed to update appointments total.');
    } finally {
      setSavingAppointments(false);
    }
  }

  return (
    <ContainerWithBackground>
      <Stack direction="row" spacing={2} alignItems="center" mb={1}>
        <Typography flex={1} variant="h5" fontWeight="bold" color="#000000">
          Clients
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => setRefreshKey((previous) => !previous)}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Total Appointments
            </Typography>
            <Typography variant="h3" fontWeight="bold" sx={{ mb: 2 }}>
              {totalAppointments}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={() => handleAdjustAppointments(-1)} disabled={savingAppointments || totalAppointments <= 0}>
                  -1
                </Button>
                <Button variant="outlined" onClick={() => handleAdjustAppointments(1)} disabled={savingAppointments}>
                  +1
                </Button>
                <Button variant="outlined" onClick={() => handleAdjustAppointments(5)} disabled={savingAppointments}>
                  +5
                </Button>
              </Stack>
              <TextField
                label="Set exact total"
                type="number"
                size="small"
                value={appointmentsDraft}
                onChange={(event) => setAppointmentsDraft(event.target.value || '0')}
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
              />
              <Button variant="contained" onClick={handleSetAppointments} disabled={savingAppointments}>
                Save
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1.2 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Add Client
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1.5 }}>
              <TextField
                label="Initials"
                size="small"
                value={initials}
                onChange={(event) => setInitials(event.target.value)}
                fullWidth
              />
              <TextField
                label="Date of Birth"
                type="date"
                size="small"
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label="Reference ID"
                size="small"
                value={referenceId}
                onChange={(event) => setReferenceId(event.target.value)}
                fullWidth
              />
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateClient}
                disabled={savingClient}
              >
                Add
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <DataGrid
        autoHeight
        rows={rows}
        columns={columns}
        loading={loading}
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
      />
    </ContainerWithBackground>
  );
}