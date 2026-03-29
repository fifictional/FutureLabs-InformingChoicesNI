import { Autocomplete, TextField } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

export default function EventSelectorAutocomplete({
  value,
  onChange,
  label = "Event",
  required = false,
  disabled = false,
  onAddRequested,
  reloadToken,
}) {
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      setLoadingEvents(true);
      try {
        const rows = await window.api.events.list();
        setEvents(Array.isArray(rows) ? rows : []);
      } catch {
        setEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    }

    fetchEvents();
  }, [reloadToken]);

  const eventOptions = useMemo(
    () => events.map((event) => ({ id: event.id, name: event.name })),
    [events]
  );

  const selectedOption = useMemo(() => {
    const current = String(value || "").trim().toLowerCase();
    if (!current) return null;
    return eventOptions.find((option) => option.name.toLowerCase() === current) || null;
  }, [eventOptions, value]);

  return (
    <Autocomplete
      options={eventOptions}
      loading={loadingEvents}
      value={selectedOption}
      inputValue={value || ""}
      disabled={disabled}
      getOptionLabel={(option) =>
        typeof option === "string" ? option : option?.inputValue || option?.name || ""
      }
      onInputChange={(_event, newInputValue, reason) => {
        // Ignore internal reset events so selected values are not overwritten.
        if (reason === "input" || reason === "clear") {
          onChange(newInputValue);
        }
      }}
      filterOptions={(options, params) => {
        const inputValue = params.inputValue.trim();
        const filtered = options.filter((option) =>
          option.name.toLowerCase().includes(inputValue.toLowerCase())
        );

        if (
          onAddRequested &&
          inputValue &&
          !options.some((option) => option.name.toLowerCase() === inputValue.toLowerCase())
        ) {
          filtered.push({
            id: "add-new",
            inputValue,
            name: `Add \"${inputValue}\"`,
          });
        }

        return filtered;
      }}
      onChange={(_event, newValue) => {
        if (!newValue) {
          onChange("");
          return;
        }

        if (newValue.id === "add-new" || newValue.inputValue) {
          if (onAddRequested) {
            onAddRequested(newValue.inputValue || "");
          }
          return;
        }

        onChange(newValue.name || "");
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          margin="dense"
          label={label}
          required={required}
          fullWidth
        />
      )}
    />
  );
}
