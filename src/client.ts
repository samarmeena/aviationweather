import {
  IAIREP,
  IAirSigmet,
  IAirSigmetOptions,
  IAircraftReportsOptions,
  IClientOptions,
  IDatasourceType,
  IGAirMet,
  IGAirmetOptions,
  IMetar,
  IMetarOptions,
  IOptions,
  IStation,
  IStationOptions,
  ITaf,
  ITafOptions,
} from ".";
import axios from "axios";
import { parse } from "fast-xml-parser";

export class Client {
  private options?: IClientOptions;
  static api = {
    AW: "https://www.aviationweather.gov/adds/dataserver_current/httpparam",
  };

  constructor(options?: IClientOptions) {
    this.options = options;
  }

  private selectField = (type: IDatasourceType) => {
    switch (type) {
      case "AIRCRAFTREPORTS":
        return "AircraftReport";
      case "AIRSIGMETS":
        return "AIRSIGMET";
      case "GAIRMETS":
        return "GAIRMET";
      case "METARS":
        return "METAR";
      case "TAFS":
        return "TAF";
      case "STATIONS":
        return "Station";
      default:
        return "METAR";
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private FormatOutput = (type: IDatasourceType, data: any[]) => {
    switch (type) {
      case "METARS": {
        return data.map((item) => {
          // remove sky condition if not present
          if (!item?.sky_condition?.length) {
            // delete item.sky_condition;
          }
          return item;
        });
      }

      case "STATIONS": {
        return data.map((item) => {
          // combination of station type
          if (item?.site_type) {
            item.site_type = Object.keys(item.site_type);
          }
          return item;
        });
      }
    }
    return data;
  };

  async AW<T extends IOptions>(
    options: T
  ): Promise<
    T extends IMetarOptions
      ? IMetar[]
      : T extends ITafOptions
      ? ITaf[]
      : T extends IAircraftReportsOptions
      ? IAIREP[]
      : T extends IAirSigmetOptions
      ? IAirSigmet[]
      : T extends IGAirmetOptions
      ? IGAirMet[]
      : T extends IStationOptions
      ? IStation[]
      : unknown
  > {
    const res = await axios.get(Client.api.AW, {
      params: { ...options, requestType: "retrieve", format: "xml" },
    });
    if (this.options?.debug) {
      console.log("API Response\n\n", res.data, "\n\n\n");
    }

    // parse xml
    const parsedData = parse(res.data, {
      ignoreAttributes: false,
      attributeNamePrefix: "",
    });

    const finalData =
      parsedData?.response?.data?.[this.selectField(options.datasource)];

    if (this.options?.debug) {
      console.log("Parsed Data\n\n", finalData, "\n\n\n");
    }

    // final output
    if (!finalData) return [];
    const output = finalData instanceof Array ? finalData : [finalData];
    return this.FormatOutput(options.datasource, output);
  }
}
