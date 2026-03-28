import { Dialog } from "@mui/material";
import { useEffect, useState } from "react";


export default function GetUserSpecificLinkDialog({ open, onClose, survey }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [selectedReferenceQuestion, setSelectedReferenceQuestion] = useState(null);

    const possibleDefaultReferenceQuestions = [
        "Please input the reference number you were provided",
        "Reference ID",
        "User ID"
    ]

    useEffect(() => {
        async function fetchQuestions() {
            if (!survey) return;
            setLoading(true);
            try {
                const questions = await window.api.questions.listByForm(survey.id);
                setQuestions(questions);

                const defaultQuestion = questions.find(q => possibleDefaultReferenceQuestions.includes(q.questionText));
                if (defaultQuestion) {
                    setSelectedReferenceQuestion(defaultQuestion.id);
                }
            } catch (err) {
                console.error("Failed to fetch questions", err);
                setError("Failed to fetch questions. Please try again.");
            } finally {
                setLoading(false);
            }
        }
        fetchQuestions();
    }, [survey]);

    if (!survey || survey.provider === "google-forms") {
        return null;
    }

    return (
        <>
        <Dialog open={open} onClose={onClose}>
            Hello there {survey.id}
        </Dialog>
        </>
    )
}