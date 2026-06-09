import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...')

  // Clear all tables in correct FK order
  console.log('🗑️ Xóa dữ liệu cũ...')
  await prisma.pumpReading.deleteMany()
  await prisma.debtTransaction.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.fuelImport.deleteMany()
  await prisma.shift.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.pump.deleteMany()
  await prisma.tank.deleteMany()
  await prisma.fuelType.deleteMany()
  await prisma.setting.deleteMany()
  await prisma.user.deleteMany()

  // ═══════════════════════════════════════════
  // 1. TẠO USERS
  // ═══════════════════════════════════════════
  console.log('👤 Tạo tài khoản...')
  const hashedPassword = await bcrypt.hash('123456', 10)

  const owner = await prisma.user.create({
    data: {
      username: 'chu',
      password: hashedPassword,
      displayName: 'Chủ trạm',
      role: 'OWNER',
    },
  })

  const employee = await prisma.user.create({
    data: {
      username: 'nhanvien',
      password: hashedPassword,
      displayName: 'Nhân viên A',
      role: 'EMPLOYEE',
    },
  })

  console.log(`  ✅ Chủ trạm: chu / 123456`)
  console.log(`  ✅ Nhân viên: nhanvien / 123456`)

  // ═══════════════════════════════════════════
  // 2. TẠO FUEL TYPES
  // ═══════════════════════════════════════════
  console.log('⛽ Tạo mặt hàng...')

  const d1 = await prisma.fuelType.create({
    data: {
      code: 'D1',
      name: 'Dầu DO (D1)',
      sellPrice: 28680,
      costPrice: 27500,
      discount: 1180,
    },
  })

  const e10 = await prisma.fuelType.create({
    data: {
      code: 'E10',
      name: 'Xăng E10',
      sellPrice: 22770,
      costPrice: 21800,
      discount: 970,
    },
  })

  const ds = await prisma.fuelType.create({
    data: {
      code: 'DS',
      name: 'Dầu DS/D5',
      sellPrice: 27390,
      costPrice: 26200,
      discount: 1190,
    },
  })

  console.log(`  ✅ D1: Bán ${d1.sellPrice.toLocaleString()}đ | Vốn ${d1.costPrice.toLocaleString()}đ | CK ${d1.discount.toLocaleString()}đ`)
  console.log(`  ✅ E10: Bán ${e10.sellPrice.toLocaleString()}đ | Vốn ${e10.costPrice.toLocaleString()}đ | CK ${e10.discount.toLocaleString()}đ`)
  console.log(`  ✅ DS: Bán ${ds.sellPrice.toLocaleString()}đ | Vốn ${ds.costPrice.toLocaleString()}đ | CK ${ds.discount.toLocaleString()}đ`)

  // ═══════════════════════════════════════════
  // 3. TẠO PUMPS
  // ═══════════════════════════════════════════
  console.log('🔧 Tạo vòi bơm...')

  const pump1 = await prisma.pump.create({
    data: { number: 1, name: 'Vòi 1', fuelTypeId: d1.id, currentMeter: 125840 },
  })
  const pump2 = await prisma.pump.create({
    data: { number: 2, name: 'Vòi 2', fuelTypeId: e10.id, currentMeter: 89320 },
  })
  const pump3 = await prisma.pump.create({
    data: { number: 3, name: 'Vòi 3', fuelTypeId: e10.id, currentMeter: 76150 },
  })
  const pump4 = await prisma.pump.create({
    data: { number: 4, name: 'Vòi 4', fuelTypeId: ds.id, currentMeter: 54280 },
  })

  console.log(`  ✅ Vòi 1 (D1), Vòi 2 (E10), Vòi 3 (E10), Vòi 4 (DS)`)

  // ═══════════════════════════════════════════
  // 4. TẠO TANKS
  // ═══════════════════════════════════════════
  console.log('🛢️ Tạo bồn chứa...')

  await prisma.tank.create({
    data: {
      name: 'Bồn D1',
      fuelTypeId: d1.id,
      maxCapacity: 10000,
      currentVolume: 5202,
      warningLow: 30,
      warningCritical: 10,
      warningHigh: 90,
    },
  })

  await prisma.tank.create({
    data: {
      name: 'Bồn E10',
      fuelTypeId: e10.id,
      maxCapacity: 15000,
      currentVolume: 8812,
      warningLow: 30,
      warningCritical: 10,
      warningHigh: 90,
    },
  })

  await prisma.tank.create({
    data: {
      name: 'Bồn DS',
      fuelTypeId: ds.id,
      maxCapacity: 8000,
      currentVolume: 2908,
      warningLow: 30,
      warningCritical: 10,
      warningHigh: 90,
    },
  })

  console.log(`  ✅ Bồn D1: 5.202/10.000 lít (52%)`)
  console.log(`  ✅ Bồn E10: 8.812/15.000 lít (59%)`)
  console.log(`  ✅ Bồn DS: 2.908/8.000 lít (36%)`)

  // ═══════════════════════════════════════════
  // 5. TẠO CUSTOMERS
  // ═══════════════════════════════════════════
  console.log('👥 Tạo khách hàng...')

  const customers = await Promise.all([
    prisma.customer.create({
      data: { name: 'Việt Hường', phone: '0912345001', currentDebt: 6020000, debtLimit: 20000000, note: 'Khách quen - xe tải' },
    }),
    prisma.customer.create({
      data: { name: 'Thân Vinh 51E', phone: '0912345002', currentDebt: 3510000, debtLimit: 15000000, note: 'Xe ben 51E' },
    }),
    prisma.customer.create({
      data: { name: 'Tuyết Bé', phone: '0912345003', currentDebt: 0, debtLimit: 40000000, note: 'Đã thanh toán hết' },
    }),
    prisma.customer.create({
      data: { name: 'Tâm Diệu', phone: '0912345004', currentDebt: 14200000, debtLimit: 30000000, note: 'Đội xe vận tải' },
    }),
    prisma.customer.create({
      data: { name: 'Hoàng Long', phone: '0912345005', currentDebt: 10360000, debtLimit: 25000000, note: 'Công ty xây dựng' },
    }),
    prisma.customer.create({
      data: { name: 'Minh Ngân', phone: '0912345006', currentDebt: 3420000, debtLimit: 10000000, note: 'Khách lẻ thường xuyên' },
    }),
    prisma.customer.create({
      data: { name: 'Quang Mỹ', phone: '0912345007', currentDebt: 0, debtLimit: 15000000, note: 'Đã thanh toán hết' },
    }),
    prisma.customer.create({
      data: { name: 'Hoàng Phi Sang', phone: '0912345008', currentDebt: 5660000, debtLimit: 20000000, note: 'Xe container' },
    }),
  ])

  const [vietHuong, thanVinh, , tamDieu, hoangLong, minhNgan, , hoangPhiSang] = customers

  console.log(`  ✅ ${customers.length} khách hàng`)
  console.log(`  💰 Tổng nợ: ${customers.reduce((s, c) => s + c.currentDebt, 0).toLocaleString()}đ`)

  // ═══════════════════════════════════════════
  // 6. TẠO SHIFTS (05/06 - 09/06/2026)
  // ═══════════════════════════════════════════
  console.log('📋 Tạo ca làm việc...')

  // Shift data: each day from 05/06 to 09/06
  const shiftConfigs = [
    {
      date: '2026-06-05',
      employee: employee,
      pump1: { start: 125120, end: 125290 }, // D1: 170 lít
      pump2: { start: 88560, end: 88820 },   // E10: 260 lít
      pump3: { start: 75600, end: 75780 },   // E10: 180 lít
      pump4: { start: 53680, end: 53820 },   // DS: 140 lít
      otherRevenue: 150000,
      cashReceived: 15200000,
      bankTransferPersonal: 2800000,
      bankTransferBusiness: 1500000,
      debtPaymentReceived: 3000000,
      debts: [
        { customer: vietHuong, type: 'NEW_DEBT' as const, amount: 1520000, fuel: d1 },
        { customer: tamDieu, type: 'NEW_DEBT' as const, amount: 2800000, fuel: d1 },
      ],
      expenses: [
        { desc: 'Mua nước uống cho nhân viên', amount: 120000, paidBy: 'Nhân viên A' },
      ],
    },
    {
      date: '2026-06-06',
      employee: employee,
      pump1: { start: 125290, end: 125480 }, // D1: 190 lít
      pump2: { start: 88820, end: 89050 },   // E10: 230 lít
      pump3: { start: 75780, end: 75940 },   // E10: 160 lít
      pump4: { start: 53820, end: 53980 },   // DS: 160 lít
      otherRevenue: 200000,
      cashReceived: 14800000,
      bankTransferPersonal: 3200000,
      bankTransferBusiness: 2000000,
      debtPaymentReceived: 5000000,
      debts: [
        { customer: hoangLong, type: 'NEW_DEBT' as const, amount: 3200000, fuel: d1 },
        { customer: minhNgan, type: 'NEW_DEBT' as const, amount: 920000, fuel: e10 },
        { customer: thanVinh, type: 'PAYMENT' as const, amount: 2000000, fuel: null },
      ],
      expenses: [
        { desc: 'Sửa máy bơm số 2', amount: 350000, paidBy: 'Chủ trạm' },
        { desc: 'Mua giẻ lau, bao tay', amount: 85000, paidBy: 'Nhân viên A' },
      ],
    },
    {
      date: '2026-06-07',
      employee: employee,
      pump1: { start: 125480, end: 125620 }, // D1: 140 lít
      pump2: { start: 89050, end: 89280 },   // E10: 230 lít
      pump3: { start: 75940, end: 76150 },   // E10: 210 lít
      pump4: { start: 53980, end: 54120 },   // DS: 140 lít
      otherRevenue: 180000,
      cashReceived: 16500000,
      bankTransferPersonal: 2600000,
      bankTransferBusiness: 1800000,
      debtPaymentReceived: 2500000,
      debts: [
        { customer: hoangPhiSang, type: 'NEW_DEBT' as const, amount: 1660000, fuel: ds },
        { customer: vietHuong, type: 'PAYMENT' as const, amount: 1500000, fuel: null },
      ],
      expenses: [
        { desc: 'Tiền điện tháng 5', amount: 1850000, paidBy: 'Chủ trạm' },
      ],
    },
    {
      date: '2026-06-08',
      employee: employee,
      pump1: { start: 125620, end: 125840 }, // D1: 220 lít
      pump2: { start: 89280, end: 89320 },   // E10: 40 lít (ca ít khách)
      pump3: { start: 76150, end: 76150 },   // E10: 0 lít (nghỉ)
      pump4: { start: 54120, end: 54280 },   // DS: 160 lít
      otherRevenue: 100000,
      cashReceived: 10200000,
      bankTransferPersonal: 1500000,
      bankTransferBusiness: 800000,
      debtPaymentReceived: 1000000,
      debts: [
        { customer: tamDieu, type: 'NEW_DEBT' as const, amount: 4300000, fuel: d1 },
      ],
      expenses: [
        { desc: 'Mua nước lọc', amount: 200000, paidBy: 'Nhân viên A' },
        { desc: 'In hóa đơn, sổ sách', amount: 150000, paidBy: 'Chủ trạm' },
      ],
    },
    {
      date: '2026-06-09',
      employee: employee,
      pump1: { start: 125840, end: 126020 }, // D1: 180 lít (ngày mới, meter tiếp tục)
      pump2: { start: 89320, end: 89580 },   // E10: 260 lít
      pump3: { start: 76150, end: 76350 },   // E10: 200 lít
      pump4: { start: 54280, end: 54450 },   // DS: 170 lít
      otherRevenue: 250000,
      cashReceived: 17800000,
      bankTransferPersonal: 3500000,
      bankTransferBusiness: 2200000,
      debtPaymentReceived: 4000000,
      debts: [
        { customer: minhNgan, type: 'NEW_DEBT' as const, amount: 1500000, fuel: e10 },
        { customer: hoangLong, type: 'PAYMENT' as const, amount: 3000000, fuel: null },
      ],
      expenses: [
        { desc: 'Mua keo ron', amount: 180000, paidBy: 'Nhân viên A' },
      ],
    },
  ]

  for (const config of shiftConfigs) {
    const shiftDate = new Date(config.date + 'T00:00:00+07:00')
    const startTime = new Date(config.date + 'T15:00:00+07:00')
    const endTimeStr = new Date(shiftDate)
    endTimeStr.setDate(endTimeStr.getDate() + 1)
    const endTime = new Date(endTimeStr.toISOString().split('T')[0] + 'T15:00:00+07:00')

    const shift = await prisma.shift.create({
      data: {
        shiftDate,
        startTime,
        endTime,
        employeeId: config.employee.id,
        status: 'CLOSED',
        otherRevenue: config.otherRevenue,
        cashReceived: config.cashReceived,
        bankTransferPersonal: config.bankTransferPersonal,
        bankTransferBusiness: config.bankTransferBusiness,
        debtPaymentReceived: config.debtPaymentReceived,
        note: `Ca ngày ${config.date}`,
      },
    })

    // Create pump readings
    await prisma.pumpReading.createMany({
      data: [
        {
          shiftId: shift.id,
          pumpId: pump1.id,
          fuelTypeId: d1.id,
          startReading: config.pump1.start,
          endReading: config.pump1.end,
          unitPrice: d1.sellPrice,
        },
        {
          shiftId: shift.id,
          pumpId: pump2.id,
          fuelTypeId: e10.id,
          startReading: config.pump2.start,
          endReading: config.pump2.end,
          unitPrice: e10.sellPrice,
        },
        {
          shiftId: shift.id,
          pumpId: pump3.id,
          fuelTypeId: e10.id,
          startReading: config.pump3.start,
          endReading: config.pump3.end,
          unitPrice: e10.sellPrice,
        },
        {
          shiftId: shift.id,
          pumpId: pump4.id,
          fuelTypeId: ds.id,
          startReading: config.pump4.start,
          endReading: config.pump4.end,
          unitPrice: ds.sellPrice,
        },
      ],
    })

    // Create debt transactions
    for (const debt of config.debts) {
      await prisma.debtTransaction.create({
        data: {
          customerId: debt.customer.id,
          shiftId: shift.id,
          type: debt.type,
          amount: debt.amount,
          fuelTypeId: debt.fuel?.id || null,
          note: debt.type === 'PAYMENT'
            ? `${debt.customer.name} trả nợ`
            : `Nợ mới - ${debt.fuel?.code || ''}`,
        },
      })
    }

    // Create expenses
    for (const exp of config.expenses) {
      await prisma.expense.create({
        data: {
          shiftId: shift.id,
          description: exp.desc,
          amount: exp.amount,
          paidBy: exp.paidBy,
          note: `Ca ${config.date}`,
        },
      })
    }

    const d1Liters = config.pump1.end - config.pump1.start
    const e10Liters = (config.pump2.end - config.pump2.start) + (config.pump3.end - config.pump3.start)
    const dsLiters = config.pump4.end - config.pump4.start
    const totalLiters = d1Liters + e10Liters + dsLiters
    console.log(`  ✅ Ca ${config.date}: ${totalLiters} lít (D1:${d1Liters} E10:${e10Liters} DS:${dsLiters})`)
  }

  // ═══════════════════════════════════════════
  // 7. TẠO FUEL IMPORTS
  // ═══════════════════════════════════════════
  console.log('📦 Tạo phiếu nhập hàng...')

  await prisma.fuelImport.create({
    data: {
      fuelTypeId: d1.id,
      quantity: 2000,
      unitPrice: 27500,
      licensePlate: '51C-234.56',
      driverName: 'Trần Văn Bình',
      supplier: 'Petrolimex',
      importDate: new Date('2026-06-04T08:00:00+07:00'),
      createdById: owner.id,
      note: 'Nhập bổ sung D1',
    },
  })

  await prisma.fuelImport.create({
    data: {
      fuelTypeId: e10.id,
      quantity: 5000,
      unitPrice: 21800,
      licensePlate: '51D-567.89',
      driverName: 'Lê Minh Quang',
      supplier: 'PV Oil',
      importDate: new Date('2026-06-05T09:30:00+07:00'),
      createdById: owner.id,
      note: 'Nhập định kỳ E10',
    },
  })

  await prisma.fuelImport.create({
    data: {
      fuelTypeId: ds.id,
      quantity: 3000,
      unitPrice: 26200,
      licensePlate: '51E-890.12',
      driverName: 'Phạm Hữu Đức',
      supplier: 'Saigon Petro',
      importDate: new Date('2026-06-06T14:00:00+07:00'),
      createdById: owner.id,
      note: 'Nhập bổ sung DS/D5',
    },
  })

  console.log(`  ✅ D1: 2.000 lít × 27.500đ = 55.000.000đ (Petrolimex)`)
  console.log(`  ✅ E10: 5.000 lít × 21.800đ = 109.000.000đ (PV Oil)`)
  console.log(`  ✅ DS: 3.000 lít × 26.200đ = 78.600.000đ (Saigon Petro)`)

  // ═══════════════════════════════════════════
  // 8. TẠO DEFAULT SETTINGS
  // ═══════════════════════════════════════════
  console.log('⚙️ Tạo cài đặt mặc định...')

  await prisma.setting.createMany({
    data: [
      { key: 'defaultDebtLimit', value: '50000000' },
      { key: 'stationName', value: 'Trạm Xăng Huy Thịnh' },
      { key: 'stationAddress', value: 'Quốc lộ 1A, TP. HCM' },
      { key: 'stationPhone', value: '0987654321' },
      { key: 'shiftStartHour', value: '15' },
      { key: 'shiftEndHour', value: '15' },
    ],
  })

  console.log(`  ✅ Hạn mức nợ mặc định: 50.000.000đ`)
  console.log(`  ✅ Ca làm: 15h - 15h hôm sau`)

  // ═══════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════
  console.log('\n═════════════════════════════════════')
  console.log('✨ SEED HOÀN TẤT!')
  console.log('═════════════════════════════════════')
  console.log(`📊 Tổng kết:`)
  console.log(`  👤 2 tài khoản (chu, nhanvien)`)
  console.log(`  ⛽ 3 mặt hàng (D1, E10, DS)`)
  console.log(`  🔧 4 vòi bơm`)
  console.log(`  🛢️ 3 bồn chứa`)
  console.log(`  👥 8 khách hàng`)
  console.log(`  📋 5 ca làm việc (05/06 - 09/06)`)
  console.log(`  📦 3 phiếu nhập hàng`)
  console.log(`  ⚙️ 6 cài đặt`)
  console.log('═════════════════════════════════════')
  console.log('🔑 Đăng nhập:')
  console.log('  Chủ trạm: chu / 123456')
  console.log('  Nhân viên: nhanvien / 123456')
  console.log('═════════════════════════════════════\n')
}

main()
  .catch((e) => {
    console.error('❌ Lỗi seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
