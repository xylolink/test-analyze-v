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
import { TextField } from '@material-ui/core'

const useStyles = makeStyles((theme) => ({
  dfCol: { backgroundColor: 'rgb(0,0,0)', color: '#FFF' }
}))

const getDiffData = (data, dosePeriod) => {
  const regions = _.uniq(data.map((item) => item.reg))
  let diffData = Immutable.Map({}).asMutable()
  regions.forEach((reg) => {
    const regionData = data.filter((item) => item.reg === reg)
    const v1Data = regionData.filter((i) => i.vaccin === 1)
    const v2Data = regionData.filter((i) => i.vaccin === 2)
    const v3Data = regionData.filter((i) => i.vaccin === 3)
    v1Data.forEach((v1Item) => {
      const v1Dose1 = getDose1(v1Item)
      const v2Item = v2Data.find((i) => i.jour === v1Item.jour)
      const v2Dose1 = getDose1(v2Item) || 0
      const v3Item = v3Data.find((i) => i.jour === v1Item.jour)
      const v3Dose1 = getDose1(v3Item) || 0
      const vaccineGoalDay = moment(v1Item.jour).add(dosePeriod, 'days')
      const v1GoalItem = v1Data.find((i) =>
        moment(i.jour).isSame(vaccineGoalDay, 'day')
      )
      const v2GoalItem = v2Data.find((i) =>
        moment(i.jour).isSame(vaccineGoalDay, 'day')
      )
      const v3GoalItem = v3Data.find((i) =>
        moment(i.jour).isSame(vaccineGoalDay, 'day')
      )
      const v1Dose2 = getDose2(v1GoalItem)
      const v2Dose2 = getDose2(v2GoalItem) || 0
      const v3Dose2 = getDose2(v3GoalItem) || 0
      let remainingV3 = v3Dose1 - v3Dose2
      remainingV3 = remainingV3 < 0 ? 0 : remainingV3

      const dose1 = v1Dose1 + v2Dose1

      let dose2 = v1Dose2 ? v1Dose2 + v2Dose2 : null
      const dose2NoV3 = !isNaN(dose2) ? dose2 - remainingV3 : null
      const diff = isNaN(dose2NoV3) ? null : dose2NoV3 - dose1
      if (dose2) {
        diffData = diffData.set(
          v1Item.jour,
          Object.assign({ day: v1Item.jour }, diffData.get(v1Item.jour), {
            [`r${reg}vARNdf`]: diff,
            [`r${reg}vARNd1`]: dose1,
            [`r${reg}vARNd2`]: dose2,
            [`r${reg}vARNd2NoAZ`]: dose2NoV3,
            [`r${reg}vAZd1`]: v3Dose1,
            [`r${reg}vAZd2`]: v3Dose2,
            [`r${reg}vAZRest`]: remainingV3
          })
        )
      }
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

  return diffData.sortBy((i) => i.day).asImmutable()
}

const getDose1 = (item) =>
  item && !isNaN(item.n_cum_dose1) ? Number(item.n_cum_dose1) : null
const getDose2 = (item) =>
  item && !isNaN(item.n_cum_dose2) ? Number(item.n_cum_dose2) : null

export default function ContainedButtons() {
  const classes = useStyles()
  const [dosePeriod, setDosePeriod] = useState(28)
  const [diffData, setDiffData] = useState(getDiffData(data, dosePeriod))
  const [tableData, setTableData] = useState(diffData.valueSeq().toArray())
  const handleSubmitPeriod = () => {
    const newData = getDiffData(data, dosePeriod)
    setDiffData(newData)
    setTableData(newData.value().toArray())
  }
  const keys = Object.keys(diffData.first())
  const columns = useMemo(
    () =>
      keys.map((k) =>
        Object.assign({
          Header: k,
          accessor: k,
          className: k.includes('df') ? classes.dfCol : '',
          style: k.includes('df') ? { fontWeight: 500 } : {}
        })
      ),
    [keys, classes]
  )
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow
  } = useTable({ columns, data: tableData })

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
      <div style={{ display: 'flex', margin: '6px 0' }}>
        <TextField
          label="délai entre 2 doses"
          type="number"
          value={dosePeriod}
          onChange={(e) =>
            !isNaN(e.target.value)
              ? setDosePeriod(Number(e.target.value))
              : void 0
          }
        />
        <div style={{ marginLeft: 6 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmitPeriod}
          >
            Calculer
          </Button>
        </div>
      </div>
      <MaUTable {...getTableProps()}>
        <TableHead>
          {headerGroups.map((headerGroup) => (
            <TableRow {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <TableCell
                  {...column.getHeaderProps([
                    { className: column.className, style: column.style }
                  ])}
                >
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
                    <TableCell
                      {...cell.getCellProps([
                        {
                          className: cell.column.className,
                          style: Object.assign(
                            cell.column.id.includes('df')
                              ? {
                                  backgroundColor:
                                    cell.value < 0 ? '#f44336' : '#B3E5FC',
                                  color: cell.value < 0 ? '#FFF' : '#000'
                                }
                              : cell.column.id.includes('AZ')
                              ? {
                                  backgroundColor: '#BDBDBD',
                                  fontSize: '0.85rem'
                                }
                              : {},
                            cell.column.id.includes('d2')
                              ? { fontStyle: 'italic' }
                              : {}
                          )
                        }
                      ])}
                    >
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
