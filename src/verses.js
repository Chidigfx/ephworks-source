// Verses of encouragement for work, waiting and community, from the King James Version (public domain).
// One a day, the same for everyone; add or remove verses freely.
export const VERSES = [
  ['Jeremiah 29:11', 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.'],
  ['Philippians 4:13', 'I can do all things through Christ which strengtheneth me.'],
  ['Philippians 4:19', 'But my God shall supply all your need according to his riches in glory by Christ Jesus.'],
  ['Proverbs 3:5–6', 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.'],
  ['Colossians 3:23', 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men.'],
  ['Isaiah 41:10', 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.'],
  ['Matthew 6:33', 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.'],
  ['Psalm 37:5', 'Commit thy way unto the LORD; trust also in him; and he shall bring it to pass.'],
  ['Proverbs 16:3', 'Commit thy works unto the LORD, and thy thoughts shall be established.'],
  ['Joshua 1:9', 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.'],
  ['Psalm 23:1', 'The LORD is my shepherd; I shall not want.'],
  ['Romans 8:28', 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.'],
  ['Isaiah 40:31', 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.'],
  ['Matthew 11:28', 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.'],
  ['1 Peter 5:7', 'Casting all your care upon him; for he careth for you.'],
  ['Galatians 6:9', 'And let us not be weary in well doing: for in due season we shall reap, if we faint not.'],
  ['Psalm 90:17', 'And let the beauty of the LORD our God be upon us: and establish thou the work of our hands upon us; yea, the work of our hands establish thou it.'],
  ['Deuteronomy 31:6', 'Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee.'],
  ['Lamentations 3:22–23', 'It is of the LORD’s mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.'],
  ['Psalm 46:1', 'God is our refuge and strength, a very present help in trouble.'],
  ['Hebrews 13:5', 'Let your conversation be without covetousness; and be content with such things as ye have: for he hath said, I will never leave thee, nor forsake thee.'],
  ['Proverbs 22:29', 'Seest thou a man diligent in his business? he shall stand before kings; he shall not stand before mean men.'],
  ['2 Timothy 1:7', 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.'],
  ['Psalm 121:1–2', 'I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD, which made heaven and earth.'],
  ['John 14:27', 'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.'],
  ['Galatians 6:2', 'Bear ye one another’s burdens, and so fulfil the law of Christ.'],
  ['Hebrews 10:24', 'And let us consider one another to provoke unto love and to good works.'],
  ['Psalm 118:24', 'This is the day which the LORD hath made; we will rejoice and be glad in it.'],
  ['Numbers 6:24–26', 'The LORD bless thee, and keep thee: the LORD make his face shine upon thee, and be gracious unto thee: the LORD lift up his countenance upon thee, and give thee peace.'],
  ['Psalm 55:22', 'Cast thy burden upon the LORD, and he shall sustain thee: he shall never suffer the righteous to be moved.']
]

// Changes at local midnight; everyone on the same day sees the same verse
export const verseOfDay = (date = new Date()) =>
  VERSES[Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000) % VERSES.length]
