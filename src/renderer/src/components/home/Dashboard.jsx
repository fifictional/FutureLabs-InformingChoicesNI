import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line 
} from 'recharts';
import {
  Card,
  CardContent,
  Typography,
  Box,
  css,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import { Edit, Star, StarHalf, StarBorder } from '@mui/icons-material';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useState } from 'react';

const CONFIGURABLE_METRIC_NAMES = {
  avgSatisfaction: 'avg_satisfaction',
  improved: 'improved',
  ageDistribution: 'age_distribution',
  referralSources: 'referral_sources',
  geographicalDistribution: 'geographical_distribution'
};

const METRIC_LABELS = {
  avg_satisfaction: 'Avg Satisfaction',
  improved: 'Improved',
  age_distribution: 'Age Distribution',
  referral_sources: 'Referral Sources',
  geographical_distribution: 'Geographical Distribution'
};

const REQUIREMENT_LABELS = {
  number: 'Requires a numeric question.',
  yes_no_choice: 'Requires a choice question that includes Yes and No options.',
  choice_or_text: 'Requires a choice or text question.'
};

const GEO_COORDINATES = {
  belfast: { lat: 54.5973, lng: -5.9301 },
  derry: { lat: 54.9966, lng: -7.3086 },
  londonderry: { lat: 54.9966, lng: -7.3086 },
  armagh: { lat: 54.3503, lng: -6.6528 },
  newry: { lat: 54.1753, lng: -6.3402 },
  lisburn: { lat: 54.5162, lng: -6.058 },
  bangor: { lat: 54.6648, lng: -5.6684 },
  coleraine: { lat: 55.1333, lng: -6.6667 },
  omagh: { lat: 54.6, lng: -7.3 },
  enniskillen: { lat: 54.3448, lng: -7.6384 },
  craigavon: { lat: 54.4478, lng: -6.387 }
};

export default function Dashboard() {
  const staticResponses = [
    {
      name: 'Alice',
      age: 34,
      satisfaction: 4,
      improved: true,
      area: 'Belfast',
      referral: 'GP',
      appointments: 3,
      year: 2023
    },
    {
      name: 'Bob',
      age: 28,
      satisfaction: 5,
      improved: true,
      area: 'Derry',
      referral: 'Self',
      appointments: 1,
      year: 2023
    },
    {
      name: 'Carol',
      age: 45,
      satisfaction: 3,
      improved: false,
      area: 'Belfast',
      referral: 'GP',
      appointments: 2,
      year: 2024
    },
    {
      name: 'Dan',
      age: 31,
      satisfaction: 4,
      improved: true,
      area: 'Armagh',
      referral: 'Social Worker',
      appointments: 4,
      year: 2024
    },
    {
      name: 'Eve',
      age: 52,
      satisfaction: 2,
      improved: false,
      area: 'Derry',
      referral: 'Self',
      appointments: 2,
      year: 2024
    }
  ];
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState('');

  const [configOpen, setConfigOpen] = useState(false);
  const [configMetricName, setConfigMetricName] = useState('');
  const [configOptions, setConfigOptions] = useState([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState('');
  const [selectedFormId, setSelectedFormId] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState('');

  const metricConfigByName = useMemo(() => {
    const configs = dashboardData?.metricConfig || [];
    return new Map(configs.map((cfg) => [cfg.name, cfg]));
  }, [dashboardData]);

  const selectedMetricConfig = metricConfigByName.get(configMetricName) || null;

  const selectableQuestionsForSelectedForm = useMemo(() => {
    const form = configOptions.find((f) => String(f.id) === String(selectedFormId));
    return form?.questions || [];
  }, [configOptions, selectedFormId]);

  const selectedMetricLabel = METRIC_LABELS[configMetricName] || 'Metric';

  async function loadDashboardData() {
    setLoadingDashboard(true);
    setDashboardError('');
    try {
      const data = await window.api.statistics.getDashboardOverviewData();
      setDashboardData(data || null);
    } catch (error) {
      setDashboardError(error?.message || 'Failed to load dashboard data.');
    } finally {
      setLoadingDashboard(false);
    }
  }

  async function openMetricConfig(metricName) {
    setConfigError('');
    setConfigMetricName(metricName);
    setConfigOpen(true);
    setConfigLoading(true);

    try {
      const options = await window.api.statistics.listSelectableSurveyQuestions(metricName);
      setConfigOptions(Array.isArray(options) ? options : []);

      const metricConfig = metricConfigByName.get(metricName);
      if (metricConfig?.selectedFormId && metricConfig?.questionId) {
        setSelectedFormId(String(metricConfig.selectedFormId));
        setSelectedQuestionId(String(metricConfig.questionId));
      } else {
        setSelectedFormId('');
        setSelectedQuestionId('');
      }
    } catch (error) {
      setConfigError(error?.message || 'Failed to load survey/question options.');
      setConfigOptions([]);
      setSelectedFormId('');
      setSelectedQuestionId('');
    } finally {
      setConfigLoading(false);
    }
  }

  function closeMetricConfig() {
    setConfigOpen(false);
    setConfigMetricName('');
    setConfigOptions([]);
    setConfigError('');
    setSelectedFormId('');
    setSelectedQuestionId('');
  }

  async function saveMetricConfig() {
    if (!selectedQuestionId) {
      setConfigError('Please choose a question first.');
      return;
    }

    setConfigSaving(true);
    setConfigError('');

    try {
      await window.api.statistics.setMetricQuestion(configMetricName, Number(selectedQuestionId));
      await loadDashboardData();
      closeMetricConfig();
    } catch (error) {
      setConfigError(error?.message || 'Failed to save metric configuration.');
    } finally {
      setConfigSaving(false);
    }
  }

  const totalSubmissions = Number(dashboardData?.totalFeedbackReceived || 0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const avgMetric = dashboardData?.metricData?.[CONFIGURABLE_METRIC_NAMES.avgSatisfaction] || {};
  const improvedMetric = dashboardData?.metricData?.[CONFIGURABLE_METRIC_NAMES.improved] || {};
  const ageMetric = dashboardData?.metricData?.[CONFIGURABLE_METRIC_NAMES.ageDistribution] || {};
  const referralMetric =
    dashboardData?.metricData?.[CONFIGURABLE_METRIC_NAMES.referralSources] || {};
  const geoMetric =
    dashboardData?.metricData?.[CONFIGURABLE_METRIC_NAMES.geographicalDistribution] || {};

  const avgSatisfaction =
    typeof avgMetric.average === 'number' && Number.isFinite(avgMetric.average)
      ? avgMetric.average.toFixed(1)
      : null;

  const improvedPercent =
    typeof improvedMetric.percent === 'number' && Number.isFinite(improvedMetric.percent)
      ? improvedMetric.percent.toFixed(1)
      : null;

  const appointmentsDelivered = staticResponses.reduce((sum, r) => sum + r.appointments, 0);

  const ageBandData = Array.isArray(ageMetric.bands) ? ageMetric.bands : [];
  const referralData = Array.isArray(referralMetric.categories) ? referralMetric.categories : [];

  const yearlyData = Object.entries(
    staticResponses.reduce((groups, r) => {
      groups[r.year] = (groups[r.year] || 0) + 1;
      return groups;
    }, {})
  ).map(([year, count]) => ({ year, count }));

  const geoData = (Array.isArray(geoMetric.categories) ? geoMetric.categories : [])
    .map((entry) => {
      const key = String(entry.name || '').trim().toLowerCase();
      const coords = GEO_COORDINATES[key];
      if (!coords) return null;
      return {
        name: entry.name,
        lat: coords.lat,
        lng: coords.lng,
        count: entry.value
      };
    })
    .filter(Boolean);

  const COLORS = ['#2E7D32', '#4CAF50', '#81C784'];

  const renderStars = (score) => {
    const stars = [];
    const fullStars = Math.floor(score);
    const hasHalf = score % 1 >= 0.5;
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} sx={{ color: '#4CAF50', fontSize: 20 }} />);
    }
    if (hasHalf) {
      stars.push(<StarHalf key="half" sx={{ color: '#4CAF50', fontSize: 20 }} />);
    }
    while (stars.length < 5) {
      stars.push(<StarBorder key={stars.length} sx={{ color: '#4CAF50', fontSize: 20 }} />);
    }
    return stars;
  };

  const dashboardBackgroundStyle = css`
    background-color: #f5f5f5;
    width: 100%;
    height: 100%;
  `;

  const dashboardContainerStyle = css`
    margin: 0 auto;
    padding: 2rem;
  `;

  const TitleWithEdit = ({ title, metricName }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
      <Typography color="text.secondary" fontSize={12}>
        {title}
      </Typography>
      {metricName ? (
        <IconButton
          size="small"
          aria-label={`Configure ${title}`}
          onClick={() => openMetricConfig(metricName)}
        >
          <Edit fontSize="inherit" />
        </IconButton>
      ) : null}
    </Box>
  );

  const SmallStatisticCard = ({ title, metricName, children }) => {
    return (
      <Card elevation={2} sx={{ flex: 1 }}>
        <CardContent sx={{ p: 2 }}>
          <TitleWithEdit title={title} metricName={metricName} />
          {children}
        </CardContent>
      </Card>
    )}

  const ChartCard = ({ title, metricName, children }) => {
    return (
      <Card elevation={2} sx={{ flex: 1, width: '50%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              {title}
            </Typography>
            {metricName ? (
              <IconButton
                size="small"
                aria-label={`Configure ${title}`}
                onClick={() => openMetricConfig(metricName)}
              >
                <Edit fontSize="inherit" />
              </IconButton>
            ) : null}
          </Box>
          {children}
        </CardContent>
      </Card>
    )};

  const MissingMetricMessage = ({ metricName }) => {
    const config = metricConfigByName.get(metricName);
    return (
      <Typography variant="body2" color="text.secondary">
        {config?.questionId
          ? 'No responses found for this question yet.'
          : 'Not configured. Use the edit button to select a survey and question.'}
      </Typography>
    );
  };


  return (
    <>  
    <Box css={dashboardBackgroundStyle}>
      <Box css={dashboardContainerStyle}>

        {dashboardError ? <Alert severity="error" sx={{ mb: 2 }}>{dashboardError}</Alert> : null}

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <SmallStatisticCard title="Total Feedback Received">
            <Typography variant="h4" fontWeight="bold">
              {totalSubmissions}
            </Typography>
          </SmallStatisticCard>
          <SmallStatisticCard
            title="Avg Satisfaction"
            metricName={CONFIGURABLE_METRIC_NAMES.avgSatisfaction}
          >
            {avgSatisfaction ? (
              <>
                <Box sx={{ display: 'flex' }}>{renderStars(parseFloat(avgSatisfaction))}</Box>
                <Typography variant="h6" fontWeight="bold">
                  {avgSatisfaction} / 5
                </Typography>
              </>
            ) : (
              <MissingMetricMessage metricName={CONFIGURABLE_METRIC_NAMES.avgSatisfaction} />
            )}
          </SmallStatisticCard>
          <SmallStatisticCard title="Improved" metricName={CONFIGURABLE_METRIC_NAMES.improved}>
            {improvedPercent ? (
              <Typography variant="h4" fontWeight="bold">
                {improvedPercent}%
              </Typography>
            ) : (
              <MissingMetricMessage metricName={CONFIGURABLE_METRIC_NAMES.improved} />
            )}
          </SmallStatisticCard>
          <SmallStatisticCard title="Total Appointments Delivered">
            <Typography variant="h4" fontWeight="bold">
              {appointmentsDelivered}
            </Typography>
          </SmallStatisticCard>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, pb: 2 }}>
          <ChartCard title="Age Distribution" metricName={CONFIGURABLE_METRIC_NAMES.ageDistribution}>
            {ageBandData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ageBandData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <XAxis dataKey="band" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <MissingMetricMessage metricName={CONFIGURABLE_METRIC_NAMES.ageDistribution} />
            )}
          </ChartCard>
          <ChartCard title="Referral Sources" metricName={CONFIGURABLE_METRIC_NAMES.referralSources}>
            {referralData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={referralData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {referralData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend iconSize={10} />
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <MissingMetricMessage metricName={CONFIGURABLE_METRIC_NAMES.referralSources} />
            )}
          </ChartCard>
        </Box>
        <Box sx={{ display: 'flex', gap: 2}}>
          <ChartCard title="Yearly Growth in Service Users">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={yearlyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="year" />
                <YAxis />
                <RechartsTooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#4CAF50"
                  strokeWidth={2}
                  dot={{ fill: '#4CAF50' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard
            title="Geographical Distribution"
            metricName={CONFIGURABLE_METRIC_NAMES.geographicalDistribution}
          >
            {geoData.length > 0 ? (
              <Box sx={{ height: 220 }}>
                <MapContainer
                  center={[54.7, -6.5]}
                  zoom={7}
                  style={{ height: '100%', width: '100%', borderRadius: '8px' }}
                >
                  <TileLayer url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' />
                  {geoData.map((location) => (
                    <CircleMarker
                      key={location.name}
                      center={[location.lat, location.lng]}
                      radius={Math.max(6, location.count * 6)}
                      fillColor="#4CAF50"
                      color="#2E7D32"
                      weight={2}
                      fillOpacity={0.6}
                    >
                      <Popup>
                        {location.name}: {location.count} people
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </Box>
            ) : (
              <MissingMetricMessage metricName={CONFIGURABLE_METRIC_NAMES.geographicalDistribution} />
            )}
          </ChartCard>
        </Box>

        {loadingDashboard ? (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Loading dashboard metrics...
            </Typography>
          </Box>
        ) : null}
      </Box>
    </Box>

    <Dialog open={configOpen} onClose={configSaving ? undefined : closeMetricConfig} fullWidth maxWidth="sm">
      <DialogTitle>Configure {selectedMetricLabel}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pick a survey first, then select the question this metric should use. Data from all surveys with
          the same question text will be included.
        </Typography>

        {selectedMetricConfig ? (
          <Typography variant="caption" display="block" sx={{ mb: 2 }}>
            {REQUIREMENT_LABELS[selectedMetricConfig.requirement] || ''}
          </Typography>
        ) : null}

        <TextField
          select
          margin="dense"
          label="Survey"
          fullWidth
          value={selectedFormId}
          onChange={(e) => {
            setSelectedFormId(e.target.value);
            setSelectedQuestionId('');
          }}
          disabled={configLoading || configSaving}
        >
          {configOptions.map((form) => (
            <MenuItem key={form.id} value={String(form.id)}>
              {form.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          margin="dense"
          label="Question"
          fullWidth
          value={selectedQuestionId}
          onChange={(e) => setSelectedQuestionId(e.target.value)}
          disabled={!selectedFormId || configLoading || configSaving}
        >
          {selectableQuestionsForSelectedForm.map((question) => (
            <MenuItem key={question.id} value={String(question.id)}>
              {question.text}
            </MenuItem>
          ))}
        </TextField>

        {configError ? <Alert severity="error" sx={{ mt: 2 }}>{configError}</Alert> : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={closeMetricConfig} disabled={configSaving}>
          Cancel
        </Button>
        <Button onClick={saveMetricConfig} variant="contained" disabled={configLoading || configSaving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}