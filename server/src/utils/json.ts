export const parseJson = (jsonString: string) => {
  try {
    return JSON.parse(jsonString.replace("```json", "").replace("```", ""));
  } catch (error) {
    console.log(error);
    return null;
  }
};
