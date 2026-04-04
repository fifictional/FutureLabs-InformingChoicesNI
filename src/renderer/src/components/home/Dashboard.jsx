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
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import { Download, Edit, Refresh, Star, StarHalf, StarBorder } from '@mui/icons-material';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import QuestionSelectorDialog from '../analysis/QuestionSelectorDialog';
import { exportElementAsPng } from '../../common/exportChartImage';

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

let cachedDashboardData = null;
let cachedAppointmentsTotal = 0;


const GEO_COORDINATES = {
  belfast: { lat: 54.5973, lng: -5.9301 },
  'east belfast': { lat: 54.595, lng: -5.86 },
  'north belfast': { lat: 54.63, lng: -5.95 },
  'south belfast and mid down': { lat: 54.45, lng: -5.9 },
  'west belfast': { lat: 54.6, lng: -5.99 },
  derry: { lat: 54.9966, lng: -7.3086 },
  londonderry: { lat: 54.9966, lng: -7.3086 },
  'east derry/londonderry': { lat: 55.02, lng: -6.95 },
  foyle: { lat: 54.99, lng: -7.32 },
  antrim: { lat: 54.7192, lng: -6.2073 },
  'north antrim': { lat: 55.08, lng: -6.35 },
  'east antrim': { lat: 54.85, lng: -5.85 },
  'south antrim': { lat: 54.67, lng: -6.13 },
  'mid and east antrim': { lat: 54.85, lng: -5.85 },
  carrickfergus: { lat: 54.7158, lng: -5.8058 },
  larne: { lat: 54.85, lng: -5.8167 },
  ballymena: { lat: 54.8639, lng: -6.2767 },
  'antrim and newtownabbey': { lat: 54.72, lng: -6.03 },
  newtownabbey: { lat: 54.66, lng: -5.9 },
  'ards and north down': { lat: 54.58, lng: -5.67 },
  ards: { lat: 54.58, lng: -5.67 },
  'north down': { lat: 54.58, lng: -5.67 },
  strangford: { lat: 54.38, lng: -5.58 },
  'lagan valley': { lat: 54.5, lng: -6.02 },
  fermanagh: { lat: 54.35, lng: -7.65 },
  'fermanagh and south tyrone': { lat: 54.41, lng: -7.17 },
  'fermanagh and omagh': { lat: 54.47, lng: -7.72 },
  tyrone: { lat: 54.65, lng: -7.35 },
  'west tyrone': { lat: 54.72, lng: -7.56 },
  'mid ulster': { lat: 54.65, lng: -6.75 },
  'causeway coast and glens': { lat: 55.05, lng: -6.65 },
  down: { lat: 54.33, lng: -5.7 },
  'south down': { lat: 54.23, lng: -5.9 },
  'newry mourne and down': { lat: 54.2, lng: -6.25 },
  'newry and armagh': { lat: 54.27, lng: -6.38 },
  'armagh city banbridge and craigavon': { lat: 54.4, lng: -6.4 },
  banbridge: { lat: 54.35, lng: -6.28 },
  'upper bann': { lat: 54.4, lng: -6.45 },
  'derry city and strabane': { lat: 54.98, lng: -7.32 },
  strabane: { lat: 54.82, lng: -7.47 },
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
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(() => cachedDashboardData);
  const [totalAppointments, setTotalAppointments] = useState(() => cachedAppointmentsTotal);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');


  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorSurveys, setSelectorSurveys] = useState([]);
  const [selectorMetricName, setSelectorMetricName] = useState('');
  const [selectorLoading, setSelectorLoading] = useState(false);
  const [appointmentsDialogOpen, setAppointmentsDialogOpen] = useState(false);
  const [appointmentsDraft, setAppointmentsDraft] = useState('0');
  const [appointmentsSaving, setAppointmentsSaving] = useState(false);
  const hasInitializedDateEffect = useRef(false);

  const metricConfigByName = useMemo(() => {
    const configs = dashboardData?.metricConfig || [];
    return new Map(configs.map((cfg) => [cfg.name, cfg]));
  }, [dashboardData]);


  async function loadDashboardData() {
    setLoadingDashboard(true);
    setDashboardError('');
    try {
      const [dashboardResult, appointmentsResult] = await Promise.allSettled([
        window.api.statistics.getDashboardOverviewData({
          startDate: dateRangeStart || null,
          endDate: dateRangeEnd || null
        }),
        window.api.clients.getTotalAppointments()
      ]);

      if (dashboardResult.status !== 'fulfilled') {
        throw dashboardResult.reason;
      }

      const nextData = dashboardResult.value || null;
      setDashboardData(nextData);
      cachedDashboardData = nextData;

      if (appointmentsResult.status === 'fulfilled') {
        const nextAppointments = Number(appointmentsResult.value || 0);
        setTotalAppointments(nextAppointments);
        cachedAppointmentsTotal = nextAppointments;
      }
    } catch (error) {
      setDashboardError(error?.message || 'Failed to load dashboard data.');
    } finally {
      setLoadingDashboard(false);
    }
  }

  async function refreshAllSurveysAndDashboard() {
    setRefreshingAll(true);
    setDashboardError('');
    try {
      await window.api.forms.list();
      await loadDashboardData();
    } catch (error) {
      setDashboardError(error?.message || 'Failed to refresh surveys and dashboard data.');
    } finally {
      setRefreshingAll(false);
    }
  }


  async function openMetricConfig(metricName) {
    setSelectorMetricName(metricName);
    setSelectorOpen(true);
    setSelectorLoading(true);
    setSelectorSurveys([]);

    try {
      const [options, allForms, allEvents] = await Promise.all([
        window.api.statistics.listSelectableSurveyQuestions(metricName),
        window.api.forms.list(),
        window.api.events.listWithSurveyCountsAndTags()
      ]);

      const formEventIdByFormId = new Map(
        (Array.isArray(allForms) ? allForms : []).map((form) => [Number(form.id), Number(form.eventId)])
      );

      const eventById = new Map(
        (Array.isArray(allEvents) ? allEvents : []).map((event) => [Number(event.id), event])
      );

      // API returns forms with questions; map each form directly to a selector survey.
      const surveys = (Array.isArray(options) ? options : []).map((form) => {
        const eventIdFromOption = Number(form.eventId);
        const eventId = Number.isInteger(eventIdFromOption) && eventIdFromOption > 0
          ? eventIdFromOption
          : formEventIdByFormId.get(Number(form.id));
        const eventMeta = eventById.get(Number(eventId));
        const mergedEventTags = (form.eventTags || []).length
          ? form.eventTags
          : eventMeta?.tags || [];

        return {
        id: form.id,
        name: form.name || `Survey ${form.id}`,
        eventName: form.eventName || eventMeta?.name || 'Unknown event',
        eventTags: mergedEventTags.map((tag) => String(tag).trim()).filter(Boolean),
        questions: (form.questions || []).map((question) => ({
          id: question.id,
          text: question.text,
          answerType: question.answerType
        }))
      };
      });

      setSelectorSurveys(surveys.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      alert(error?.message || 'Failed to load survey/question options.');
    } finally {
      setSelectorLoading(false);
    }
  }

  function handleQuestionSelected(surveyId, question) {
    setSelectorOpen(false);
    saveMetricConfig(selectorMetricName, surveyId, question);
  }

  async function saveMetricConfig(metricName, surveyId, selectedQuestion) {
    if (!selectedQuestion) {
      alert('Please choose a question first.');
      return;
    }

    try {
      const liveQuestions = await window.api.questions.listByForm(Number(surveyId));
      const selectedQuestionId = Number(selectedQuestion.id);

      // Prefer exact ID match; fallback to text+answerType when IDs are stale/mismatched.
      const resolvedQuestion = (Array.isArray(liveQuestions) ? liveQuestions : []).find((question) => {
        if (Number(question.id) === selectedQuestionId) {
          return true;
        }

        return (
          String(question.text || '').trim() === String(selectedQuestion.text || '').trim() &&
          String(question.answerType || '').trim() ===
            String(selectedQuestion.answerType || '').trim()
        );
      });

      if (!resolvedQuestion?.id) {
        alert('Selected question no longer exists in this survey. Please pick another question.');
        return;
      }

      await window.api.statistics.setMetricQuestion(metricName, Number(resolvedQuestion.id));
      await loadDashboardData();
    } catch (error) {
      alert(error?.message || 'Failed to save metric configuration.');
    }
  }

  function openAppointmentsDialog() {
    setAppointmentsDraft(String(totalAppointments || 0));
    setAppointmentsDialogOpen(true);
  }

  async function setAppointmentsTotal(nextValue) {
    setAppointmentsSaving(true);
    try {
      const updatedValue = await window.api.clients.setTotalAppointments(nextValue);
      const normalizedValue = Number(updatedValue || 0);
      setTotalAppointments(normalizedValue);
      cachedAppointmentsTotal = normalizedValue;
      setAppointmentsDraft(String(normalizedValue));
      setAppointmentsDialogOpen(false);
    } catch (error) {
      alert(error?.message || 'Failed to save total appointments.');
    } finally {
      setAppointmentsSaving(false);
    }
  }

  async function adjustAppointments(delta) {
    setAppointmentsSaving(true);
    try {
      const updatedValue = await window.api.clients.adjustTotalAppointments(delta);
      const normalizedValue = Number(updatedValue || 0);
      setTotalAppointments(normalizedValue);
      cachedAppointmentsTotal = normalizedValue;
      setAppointmentsDraft(String(normalizedValue));
    } catch (error) {
      alert(error?.message || 'Failed to update total appointments.');
    } finally {
      setAppointmentsSaving(false);
    }
  }

  const totalSubmissions = Number(dashboardData?.totalFeedbackReceived || 0);
  const totalUsers = Number(dashboardData?.totalUsers || 0);
  const totalIdentifiedUsers = Number(dashboardData?.totalIdentifiedUsers || 0);
  const totalUnidentifiedUsers = Number(dashboardData?.totalUnidentifiedUsers || 0);

  useEffect(() => {
    refreshAllSurveysAndDashboard();
  }, []);

  useEffect(() => {
    if (!hasInitializedDateEffect.current) {
      hasInitializedDateEffect.current = true;
      return;
    }
    loadDashboardData();
  }, [dateRangeStart, dateRangeEnd]);

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

  const ageBandData = Array.isArray(ageMetric.bands) ? ageMetric.bands : [];
  const referralData = Array.isArray(referralMetric.categories) ? referralMetric.categories : [];
  const yearlyData = Array.isArray(dashboardData?.yearlyServiceUsers)
    ? dashboardData.yearlyServiceUsers
    : [];

  const geoData = (Array.isArray(geoMetric.categories) ? geoMetric.categories : [])
    .map((entry) => {
      const key = String(entry.name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\./g, '');
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

  const TitleWithEdit = ({ title, metricName, onEdit }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
      <Typography color="text.secondary" fontSize={12}>
        {title}
      </Typography>
      {metricName || onEdit ? (
        <IconButton
          size="small"
          aria-label={`Configure ${title}`}
          onClick={() => (onEdit ? onEdit() : openMetricConfig(metricName))}
        >
          <Edit fontSize="inherit" />
        </IconButton>
      ) : null}
    </Box>
  );

  const SmallStatisticCard = ({ title, metricName, onEdit, children }) => {
    return (
      <Card elevation={2} sx={{ flex: 1 }}>
        <CardContent sx={{ p: 2 }}>
          <TitleWithEdit title={title} metricName={metricName} onEdit={onEdit} />
          {children}
        </CardContent>
      </Card>
    )}

  const ChartCard = ({ title, metricName, children }) => {
    const cardRef = useRef(null);
    const chartExportRef = useRef(null);
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
      if (!chartExportRef.current || exporting) {
        return;
      }

      setExporting(true);
      try {
        await exportElementAsPng(chartExportRef.current, title);
      } catch (error) {
        alert(error?.message || 'Failed to export chart image.');
      } finally {
        setExporting(false);
      }
    };

    return (
      <Card ref={cardRef} elevation={2} sx={{ flex: 1, width: '50%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              {title}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <IconButton
                size="small"
                aria-label={`Export ${title} as image`}
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? <CircularProgress size={16} /> : <Download fontSize="inherit" />}
              </IconButton>
              {metricName ? (
                <IconButton
                  size="small"
                  aria-label={`Configure ${title}`}
                  onClick={() => openMetricConfig(metricName)}
                >
                  <Edit fontSize="inherit" />
                </IconButton>
              ) : null}
            </Stack>
          </Box>
          <Box ref={chartExportRef} sx={{ width: '100%', minWidth: 0 }}>
            {children}
          </Box>
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

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flex: 1 }}>
            <TextField
              label="Start date"
              type="date"
              value={dateRangeStart}
              onChange={(e) => setDateRangeStart(e.target.value || '')}
              slotProps={{ inputLabel: { shrink: true } }}
              size="small"
            />
            <TextField
              label="End date"
              type="date"
              value={dateRangeEnd}
              onChange={(e) => setDateRangeEnd(e.target.value || '')}
              slotProps={{ inputLabel: { shrink: true } }}
              size="small"
            />
          </Stack>
          <Button
            variant="outlined"
            onClick={() => navigate('/clients')}
          >
            Clients
          </Button>
          <Button
            variant="outlined"
            startIcon={refreshingAll ? <CircularProgress size={14} /> : <Refresh />}
            onClick={refreshAllSurveysAndDashboard}
            disabled={refreshingAll || loadingDashboard}
          >
            Refresh All Surveys
          </Button>
        </Box>

        {dashboardError ? <Alert severity="error" sx={{ mb: 2 }}>{dashboardError}</Alert> : null}

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <SmallStatisticCard title="Total Feedback Received">
            <Typography variant="h4" fontWeight="bold">
              {totalSubmissions}
            </Typography>
          </SmallStatisticCard>
          <SmallStatisticCard title="Total Appointments" onEdit={openAppointmentsDialog}>
            <Typography variant="h4" fontWeight="bold">
              {totalAppointments}
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
          <SmallStatisticCard title="Total Users">
            <Typography variant="h4" fontWeight="bold">
              {totalUsers}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              Identified (unique reference IDs): {totalIdentifiedUsers}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              Unidentified (no reference ID): {totalUnidentifiedUsers}
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
          <ChartCard title="Yearly Identified Users">
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
              Unique identified users per year based on reference IDs.
            </Typography>
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

    <QuestionSelectorDialog
      open={selectorOpen}
      surveys={selectorSurveys}
      loading={selectorLoading}
      onClose={() => setSelectorOpen(false)}
      onSelectQuestion={handleQuestionSelected}
      questionFilter="all"
      title={`Configure ${METRIC_LABELS[selectorMetricName] || 'Metric'}`}
    />

    <Dialog open={appointmentsDialogOpen} onClose={appointmentsSaving ? undefined : () => setAppointmentsDialogOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle>Edit Total Appointments</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Adjust the running appointments total manually.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => adjustAppointments(-1)} disabled={appointmentsSaving || totalAppointments <= 0}>
              -1
            </Button>
            <Button variant="outlined" onClick={() => adjustAppointments(1)} disabled={appointmentsSaving}>
              +1
            </Button>
            <Button variant="outlined" onClick={() => adjustAppointments(5)} disabled={appointmentsSaving}>
              +5
            </Button>
          </Stack>
          <TextField
            label="Set exact total"
            type="number"
            value={appointmentsDraft}
            onChange={(event) => setAppointmentsDraft(event.target.value || '0')}
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAppointmentsDialogOpen(false)} disabled={appointmentsSaving}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => setAppointmentsTotal(Number(appointmentsDraft || 0))}
          disabled={appointmentsSaving}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}