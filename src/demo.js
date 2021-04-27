import React, {
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from 'react'
import { makeStyles } from '@material-ui/core/styles'
import Button from '@material-ui/core/Button'
import data from './data.js'
import _ from 'underscore'
import moment from 'moment'
import Immutable from 'immutable'
import { useTable } from 'react-table'
import MaUTable from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'

const useStyles = makeStyles((theme) => ({
  root: {
    '& > *': {
      margin: theme.spacing(1)
    }
  }
}))

export default function ContainedButtons() {
  const classes = useStyles()
  const regions = _.uniq(data.map((item) => item.reg))
  const vaccines = _.uniq(data.map((item) => item.vaccin))
  let diffData = Immutable.Map({}).asMutable()

  regions.forEach((reg) => {
    const regionData = data.filter((item) => item.reg === reg)
    const v1Data = regionData.filter((i) => i.vaccin === 1)
    const v3Data = regionData.filter((i) => i.vaccin === 3)
    v1Data.forEach((v1Dose1Item) => {
      const v3Dose1Data = regionData.find(
        (i) => i.vaccin === 3 && i.jour === v1Dose1Item.jour
      )
      const v3Dose1 =
        v3Dose1Data && !isNaN(v3Dose1Data.n_cum_dose1)
          ? Number(v3Dose1Data.n_cum_dose1)
          : 0
      const vaccineGoalDay = moment(v1Dose1Item.jour).add(42, 'day')
      const v1GoalItem = v1Data.find((i) =>
        moment(i.jour).isSame(vaccineGoalDay, 'day')
      )
      const v3GoalItem = v3Data.find((i) =>
        moment(i.jour).isSame(vaccineGoalDay, 'day')
      )
      const v3Dose2 =
        v3GoalItem && !isNaN(v3GoalItem.dose2) ? Number(v3GoalItem.dose2) : 0
      let remainingV3 = v3Dose1 - v3Dose2
      remainingV3 = remainingV3 < 0 ? 0 : remainingV3

      const dose1 = v1Dose1Item.n_cum_dose1
        ? Number(v1Dose1Item.n_cum_dose1)
        : null
      let dose2 =
        v1GoalItem && v1GoalItem.n_cum_dose2
          ? Number(v1GoalItem.n_cum_dose2)
          : null
      const dose2NoV3 = !isNaN(dose2) ? dose2 - remainingV3 : ''
      const diff = isNaN(dose1) || isNaN(dose2NoV3) ? '' : dose2NoV3 - dose1
      diffData = diffData.set(
        v1Dose1Item.jour,
        Object.assign(
          { day: v1Dose1Item.jour },
          diffData.get(v1Dose1Item.jour),
          {
            [`r${reg}v1df`]: diff,
            [`r${reg}v1d1`]: dose1,
            [`r${reg}v1d2`]: dose2,
            [`r${reg}v3d2NoV3`]: dose2NoV3,
            [`r${reg}v3d1`]: v3Dose1,
            [`r${reg}v3d2`]: v3Dose2,
            [`r${reg}v3Rest`]: remainingV3
          }
        )
      )
    })
    // vaccines.forEach((vaccine, k) => {
    //   const vaccineData = regionData.filter((i) => i.vaccin === vaccine);
    //   const sortedData = _.sortBy(vaccineData, (item) => moment(item.jour));
    //   sortedData.forEach((dayItem, k) => {
    //     const vaccineGoalDay = moment(dayItem.jour).add(42, "day");
    //     const vaccineGoalItem = sortedData.find((i) =>
    //       moment(i.jour).isSame(vaccineGoalDay, "day")
    //     );
    //     const dose1 = dayItem.n_cum_dose1 ? Number(dayItem.n_cum_dose1) : "";
    //     const dose2 =
    //       vaccineGoalItem && vaccineGoalItem.n_cum_dose2
    //         ? Number(vaccineGoalItem.n_cum_dose2)
    //         : "";
    //     const diff =
    //       isNaN(dayItem.n_cum_dose1) ||
    //       !vaccineGoalItem ||
    //       isNaN(vaccineGoalItem.n_cum_dose2)
    //         ? ""
    //         : Number(vaccineGoalItem.n_cum_dose2) - Number(dayItem.n_cum_dose1);
    //     diffData = diffData.set(
    //       dayItem.jour,
    //       Object.assign({ day: dayItem.jour }, diffData.get(dayItem.jour), {
    //         [`r${reg}v${vaccine}df`]: diff,
    //         [`r${reg}v${vaccine}d1`]: dose1,
    //         [`r${reg}v${vaccine}d2`]: dose2
    //       })
    //     );
    //   });
    // });
  })
  const keys = Object.keys(diffData.first())
  const columns = useMemo(() => keys.map((k) => ({ Header: k, accessor: k })), [
    keys
  ])
  const sortedDiffData = diffData.sortBy((i) => i.day)
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow
  } = useTable({ columns, data: sortedDiffData.valueSeq().toArray() })

  const handleGenerateJSON = () => {
    const json = JSON.stringify(diffData)
    const blob = new Blob([json], { type: 'text/plain;charset=utf-8' })
    const url = window.URL || window.webkitURL
    const link = url.createObjectURL(blob)
    let a = document.createElement('a')
    a.download = 'diffData.txt'
    a.href = link
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
  return (
    <div className={classes.root}>
      <Button variant="contained" onClick={handleGenerateJSON}>
        DL
      </Button>
      <MaUTable {...getTableProps()}>
        <TableHead>
          {headerGroups.map((headerGroup) => (
            <TableRow {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <TableCell {...column.getHeaderProps()}>
                  {column.render('Header')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {rows.map((row, i) => {
            prepareRow(row)
            return (
              <TableRow {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  return (
                    <TableCell {...cell.getCellProps()}>
                      {cell.render('Cell')}
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </MaUTable>
    </div>
  )
}
