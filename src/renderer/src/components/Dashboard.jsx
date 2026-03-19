import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { Star, StarHalf, StarBorder } from '@mui/icons-material';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css';

function Dashboard() {
  const responses = [
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
  const geoData = [
  { name: 'Belfast', lat: 54.5973, lng: -5.9301, count: responses.filter(r => r.area === 'Belfast').length },
  { name: 'Derry', lat: 54.9966, lng: -7.3086, count: responses.filter(r => r.area === 'Derry').length },
  { name: 'Armagh', lat: 54.3503, lng: -6.6528, count: responses.filter(r => r.area === 'Armagh').length }
]

  const totalUsers = responses.length;
  const total = responses.reduce((sum, r) => sum + r.satisfaction, 0);
  const avgSatisfaction = (total / responses.length).toFixed(1);
  const improvedCount = responses.filter((r) => r.improved === true).length;
  const improvedPercent = ((improvedCount / responses.length) * 100).toFixed(1);
  const appointmentsDelivered = responses.reduce((sum, r) => sum + r.appointments, 0);

  const ageBandData = [
    { band: '0-18', count: responses.filter((r) => r.age <= 18).length },
    { band: '19-35', count: responses.filter((r) => r.age >= 19 && r.age <= 35).length },
    { band: '36-50', count: responses.filter((r) => r.age >= 36 && r.age <= 50).length },
    { band: '51+', count: responses.filter((r) => r.age >= 51).length }
  ];

  const referralData = Object.entries(
    responses.reduce((groups, r) => {
      groups[r.referral] = (groups[r.referral] || 0) + 1;
      return groups;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const yearlyData = Object.entries(
    responses.reduce((groups, r) => {
      groups[r.year] = (groups[r.year] || 0) + 1;
      return groups;
    }, {})
  ).map(([year, count]) => ({ year, count }));

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

  return (
    <Box sx={{ backgroundColor: '#f5f5f5', minHeight: '100vh', width: '100%', overflowY: 'auto' }}>
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Typography variant="h4" fontWeight="bold" mb={3} color="#000000">
          Dashboard
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Card elevation={2} sx={{ flex: 1 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography color="text.secondary" fontSize={12} mb={0.5}>
                Total Feedback Received
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {totalUsers}
              </Typography>
            </CardContent>
          </Card>

          <Card elevation={2} sx={{ flex: 1 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography color="text.secondary" fontSize={12} mb={0.5}>
                Avg Satisfaction
              </Typography>
              <Box sx={{ display: 'flex' }}>{renderStars(parseFloat(avgSatisfaction))}</Box>
              <Typography variant="h6" fontWeight="bold">
                {avgSatisfaction} / 5
              </Typography>
            </CardContent>
          </Card>

          <Card elevation={2} sx={{ flex: 1 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography color="text.secondary" fontSize={12} mb={0.5}>
                Improved
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {improvedPercent}%
              </Typography>
            </CardContent>
          </Card>

          <Card elevation={2} sx={{ flex: 1 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography color="text.secondary" fontSize={12} mb={0.5}>
                Appointments Delivered
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {appointmentsDelivered}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Card elevation={2} sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Age Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ageBandData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <XAxis dataKey="band" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card elevation={2} sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Referral Sources
              </Typography>
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
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Card elevation={2} sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Yearly Growth in Service Users
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={yearlyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#4CAF50"
                    strokeWidth={2}
                    dot={{ fill: '#4CAF50' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card elevation={2} sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Geographical Distribution
              </Typography>
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
                      radius={location.count * 10}
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
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}

export default Dashboard;
