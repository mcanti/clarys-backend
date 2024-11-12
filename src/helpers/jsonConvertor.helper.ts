export const jsonToBlob = (jsonObject: JSON)=> {

    const jsonString = JSON.stringify(jsonObject);

    const blob = new Blob([jsonString], { type: 'application/json' });

    return blob;
}

export const fileToBlob = (file) => {
    return new Blob([file], { type: typeof file });
}