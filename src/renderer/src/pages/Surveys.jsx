import { Divider } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import SurveysHeader from "../components/surveys/SurveysHeader";
import SurveysToolbar from "../components/surveys/SurveysToolbar";
import SurveysGrid from "../components/surveys/SurveysGrid";
import { buildSurveyRows } from "../common/SurveyUtils";
import ContainerWithBackground from "../components/common/ContainerWithBackground";

export default function Surveys() {
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(false);

  const selectedSurveyObject = useMemo(() => {
    if (!selectedSurvey) return null;
    return forms.find((survey) => survey.id === selectedSurvey) || null;
  }, [selectedSurvey, forms]);

  useEffect(() => {
    async function fetchForms() {
      setLoading(true);
      try {
        const formList = await window.api.forms.listWithEventNameAndResponseCount();
        setForms(formList);
      } catch (err) {
        console.error("Failed to fetch forms", err);
        window.alert("Failed to fetch forms. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchForms();
  }, [refresh]);

  const rows = useMemo(() => buildSurveyRows(forms), [forms]);

  function triggerRefresh() {
    setRefresh((prev) => !prev);
  }

  return (
    <ContainerWithBackground>
        <SurveysHeader
          selectedSurveyObject={selectedSurveyObject}
          onRefresh={triggerRefresh}
        />

        <Divider />

        <SurveysToolbar
          loading={loading}
          forms={forms}
          onRefresh={triggerRefresh}
        />

        <SurveysGrid loading={loading} rows={rows} onSelect={setSelectedSurvey} />
    </ContainerWithBackground>
  );
}