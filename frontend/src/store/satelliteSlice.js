import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import satelliteService from "../services/satelliteService";
import { notificationManager } from "../components/NotificationSystem";

export const fetchSatellites = createAsyncThunk(
  "satellites/fetchSatellites",
  async (_, { rejectWithValue }) => {
    try {
      return await satelliteService.getSatellites();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addSatellite = createAsyncThunk(
  "satellites/addSatellite",
  async (satelliteData, { rejectWithValue }) => {
    try {
      const newCompanyData = await satelliteService.addSatellite(satelliteData);
      return newCompanyData.trackedSatellites;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  items: [],
  loading: false,
  error: null,
};

const satelliteSlice = createSlice({
  name: "satellites",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSatellites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSatellites.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchSatellites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addSatellite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addSatellite.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(addSatellite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const selectSatellites = (state) => state.satellites.items;
export const selectSatellitesLoading = (state) => state.satellites.loading;
export const selectSatellitesError = (state) => state.satellites.error;

export default satelliteSlice.reducer;