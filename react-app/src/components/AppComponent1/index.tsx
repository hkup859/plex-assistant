
// TODO - work in progress choosing versions. Upgraded to @mui, which is material version 5. Need to get makeStyles & maybe other stuff working.

import React, { useContext } from 'react'
// import { makeStyles } from '@material-ui/core/styles'
import { Button } from '@mui/material'
import { DataGrid, GridColDef, GridValueGetterParams  } from '@mui/x-data-grid'
// import { createStyles, makeStyles } from '@mui/styles';
// import { createTheme, ThemeProvider } from '@mui/material/styles';

// const useStyles = makeStyles((theme: Theme) =>
//   createStyles({
//     root: {
//       backgroundColor: theme.palette.red,
//     },
//   }),
// );

// const theme = createTheme();

// export default function MyComponent() {
//   const classes = useStyles();
//   return (
//     <ThemeProvider theme={theme}>
//       <div className={classes.root} />
//     </ThemeProvider>
//   );
// }

import { AppContentContext, AppContentProvider } from './AppComponent1.context'
// const useStyles = makeStyles(() => ({
//   rootContainer: {
//     display: 'flex'
//   },
//   tableContainer: {
//     height: '400px',
//     width: '100%'
//   }
// }))

const InnerAppComponent1 = () => {
  const { lastUpdated, media, stateVariable, testButtonClick, action, lastAction, lastActionResponse, callExtractMediaDetails, callPullRawData, actionInProgress } = useContext(AppContentContext)
  // const classes = useStyles()
  const columns: GridColDef[] = [
    { field: 'mediaType', headerName: 'Media Type', width: 120 },
    { field: 'title', headerName: 'Title', width: 400 },
    { field: 'year', headerName: 'Year', width: 120 },
    { field: 'description', headerName: 'Description', width: 240 },
    { field: 'length', headerName: 'Length', width: 110 },
    { field: 'resolution', headerName: 'Resolution', width: 120 },
    { field: 'genres', headerName: 'Genre', width: 240 },
    { field: 'airData', headerName: 'Air Date', width: 240,
    valueGetter: (params: GridValueGetterParams) => params.row.airData && params.row.airData.date ? params.row.airData.date : 'Unknown',
    },
    { field: 'error', headerName: 'Error', width: 70, type: 'boolean' },
    { field: 'createdAt', headerName: 'Created At', width: 240 },
    { field: 'updatedAt', headerName: 'Updated At', width: 240 },
  ]
  
  const rows = media.map((x: any) => ({
    ...x,
    id: x.detailsLink
  }))
  // const columns: GridColDef[] = [
  //   { field: 'id', headerName: 'ID', width: 70 },
  //   { field: 'firstName', headerName: 'First name', width: 130 },
  //   { field: 'lastName', headerName: 'Last name', width: 130 },
  //   {
  //     field: 'age',
  //     headerName: 'Age',
  //     type: 'number',
  //     width: 90,
  //   },
  //   {
  //     field: 'fullName',
  //     headerName: 'Full name',
  //     description: 'This column has a value getter and is not sortable.',
  //     sortable: false,
  //     width: 160,
  //     valueGetter: (params: GridValueGetterParams) =>
  //       `${params.row.firstName || ''} ${params.row.lastName || ''}`,
  //   },
  // ];
  
  // const rows = [
  //   { id: 1, lastName: 'Snow', firstName: 'Jon', age: 35 },
  //   { id: 2, lastName: 'Lannister', firstName: 'Cersei', age: 42 },
  //   { id: 3, lastName: 'Lannister', firstName: 'Jaime', age: 45 },
  //   { id: 4, lastName: 'Stark', firstName: 'Arya', age: 16 },
  //   { id: 5, lastName: 'Targaryen', firstName: 'Daenerys', age: null },
  //   { id: 6, lastName: 'Melisandre', firstName: null, age: 150 },
  //   { id: 7, lastName: 'Clifford', firstName: 'Ferrara', age: 44 },
  //   { id: 8, lastName: 'Frances', firstName: 'Rossini', age: 36 },
  //   { id: 9, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
  // ];
  return (
    <main>
      <h1>This is an example of AppComponent1</h1>
      <Button variant="contained" onClick={testButtonClick}>Contained Button Example</Button>
      <br/>
      <br/>
      <Button variant="contained" disabled={actionInProgress} onClick={callPullRawData}>Start Pulling Raw Data</Button>
      <br/>
      <br/>
      <Button variant="contained" disabled={actionInProgress} onClick={callExtractMediaDetails}>Start Extracting Media Details</Button>
      <h4>Current Action: {action}</h4>
      <h4>Last Action: {lastAction}</h4>
      <h4>Last Action Response: {lastActionResponse}</h4>
      <p>The current stateVariable is {stateVariable}</p>
      <p>Data Last Updated: {lastUpdated}</p>
      {/* <div className={classes.tableContainer}> */}
      <div style={{ height: 1000, width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={15}
        rowsPerPageOptions={[15]}
        checkboxSelection
        initialState={{
          sorting: {
            sortModel: [{ field: 'airData', sort: 'asc' }],
          },
        }}
      />
    </div>
    </main>
  )
}

const AppComponent1 = () => {
  return (
      <AppContentProvider>
    <InnerAppComponent1 />
  </AppContentProvider>
  )
  
}

export default AppComponent1